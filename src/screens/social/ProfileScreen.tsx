import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, Platform, Modal, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { Avatar } from '../../components/ui/Avatar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { UserListItem } from '../../components/domain/UserListItem';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Icon } from '../../components/ui/Icon';
import { followService } from '../../services/api/follows';
import { danceCircleService, type DancedWithPerson } from '../../services/api/danceCircle';
import { hasSupabaseConfig } from '../../services/api/apiClient';

type UserItem = { id: number; name: string; handle: string; img: string };

const ProfileInfoRow: React.FC<{
  label: string;
  value: string;
  multiline?: boolean;
}> = ({ label, value, multiline }) => {
  const { typography, spacing, colors } = useTheme();
  const display = value.trim() ? value : '—';
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 4 }]}>{label}</Text>
      <Text
        style={[
          multiline ? typography.bodySmall : typography.bodyMedium,
          { color: '#FFFFFF', lineHeight: multiline ? 22 : undefined },
        ]}
      >
        {display}
      </Text>
    </View>
  );
};

function isSupabasePublicAvatarUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri) && uri.includes('/storage/v1/object/public/');
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, avatarSource, refreshProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'following' | 'followers' | 'requests'>('following');
  const [dancedWithList, setDancedWithList] = useState<DancedWithPerson[]>([]);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<number>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ userId: number; userName: string } | null>(null);
  const [followingList, setFollowingList] = useState<UserItem[]>([]);
  const [followersList, setFollowersList] = useState<UserItem[]>([]);
  const [requestsList, setRequestsList] = useState<UserItem[]>([]);
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number }>({ following: 0, followers: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [dancedModalVisible, setDancedModalVisible] = useState(false);
  const [followListModalVisible, setFollowListModalVisible] = useState(false);
  const shouldShowAvatarWarning = !!profile.avatarUri && !isSupabasePublicAvatarUrl(profile.avatarUri);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const loadDancedWith = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setDancedWithList([]);
      return;
    }
    try {
      const rows = await danceCircleService.listMyDancedWith();
      setDancedWithList(rows);
    } catch {
      setDancedWithList([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const counts = await followService.getMyFollowCounts();
        if (!cancelled) setFollowCounts({ following: counts.following, followers: counts.followers });
      } catch {
        // keep defaults; profile screen can still render without counts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDancedWith();
    }, [loadDancedWith]),
  );

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        followService.getMyFollowCounts().then((counts) => setFollowCounts({ following: counts.following, followers: counts.followers })),
        loadDancedWith(),
      ]);
    } catch {
      // ignore: UI already shows cached profile; refresh is best-effort
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnfollowPress = (userId: number, userName: string) => {
    setConfirmModal({ userId, userName });
  };

  const handleConfirmUnfollow = () => {
    if (confirmModal) {
      setUnfollowedIds((prev) => new Set(prev).add(confirmModal.userId));
      setConfirmModal(null);
    }
  };

  const handleFollowPress = (userId: number) => {
    setUnfollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const handleAcceptRequest = (user: UserItem) => {
    setRequestsList((prev) => prev.filter((u) => u.id !== user.id));
    setFollowersList((prev) => [...prev, user]);
  };

  const getList = () => {
    if (activeTab === 'following') return followingList;
    if (activeTab === 'followers') return followersList;
    return requestsList;
  };

  const openDancedModal = () => {
    void loadDancedWith();
    setDancedModalVisible(true);
  };

  const openFollowListModal = (tab: 'following' | 'followers') => {
    setActiveTab(tab);
    setFollowListModalVisible(true);
  };

  const followListModalTitle =
    activeTab === 'following' ? 'Takip edilenler' : activeTab === 'followers' ? 'Takipçiler' : 'İstekler';

  const nameParts = profile.displayName.trim().split(/\s+/);
  const profileAd = nameParts[0] ?? '';
  const profileSoyad = nameParts.slice(1).join(' ');

  const goToDancedUserProfile = (u: DancedWithPerson) => {
    setDancedModalVisible(false);
    (navigation.getParent() as any)?.navigate('UserProfile', {
      userId: u.id,
      name: u.name,
      username: u.username || undefined,
      avatar: u.avatar,
    });
  };

  return (
    <Screen>
      <ConfirmModal
        visible={!!confirmModal}
        title="Emin misiniz?"
        message={
          confirmModal
            ? `${confirmModal.userName} kullanıcısını takipten çıkarmak istediğinize emin misiniz?`
            : ''
        }
        cancelLabel="İptal"
        confirmLabel="Eminim"
        onCancel={() => setConfirmModal(null)}
        onConfirm={handleConfirmUnfollow}
      />

      <Modal visible={dancedModalVisible} transparent animationType="slide" onRequestClose={() => setDancedModalVisible(false)}>
        <View style={styles.dancedModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setDancedModalVisible(false)} />
          <View
            style={[
              styles.dancedModalSheet,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '88%',
              },
            ]}
          >
            <View style={styles.dancedModalHandle} />
            <View style={[styles.dancedModalHeader, { paddingHorizontal: spacing.lg }]}>
              <Text style={[typography.h4, { color: '#FFFFFF' }]}>Dans edilenler</Text>
              <TouchableOpacity
                onPress={() => setDancedModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.dancedModalClose, { borderRadius: radius.full, borderColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {dancedWithList.length > 0 ? (
                dancedWithList.map((u) => (
                  <UserListItem
                    key={u.id}
                    name={u.name}
                    subtitle={u.username ? `@${u.username}` : undefined}
                    avatar={u.avatar}
                    onPress={() => goToDancedUserProfile(u)}
                    nameColor="#FFFFFF"
                    subtitleColor="#9CA3AF"
                  />
                ))
              ) : (
                <Text style={[typography.bodySmall, { color: '#9CA3AF', paddingVertical: spacing.xl, textAlign: 'center' }]}>
                  {hasSupabaseConfig()
                    ? "Dance Circle'da sağa kaydırdığın kişiler burada listelenir."
                    : 'Dans ettiklerinizi görmek için uygulama yapılandırması gerekir.'}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={followListModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowListModalVisible(false)}
      >
        <View style={styles.dancedModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFollowListModalVisible(false)} />
          <View
            style={[
              styles.dancedModalSheet,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '88%',
              },
            ]}
          >
            <View style={styles.dancedModalHandle} />
            <View style={[styles.dancedModalHeader, { paddingHorizontal: spacing.lg }]}>
              <Text style={[typography.h4, { color: '#FFFFFF' }]}>{followListModalTitle}</Text>
              <TouchableOpacity
                onPress={() => setFollowListModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.dancedModalClose, { borderRadius: radius.full, borderColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <TabSwitch
                tabs={[
                  { key: 'following', label: 'Takip Edilen' },
                  { key: 'followers', label: 'Takipçiler' },
                  { key: 'requests', label: 'İstekler', badge: requestsList.length > 0 ? requestsList.length : undefined },
                ]}
                activeTab={activeTab}
                onTabChange={(k) => setActiveTab(k as 'following' | 'followers' | 'requests')}
                containerRadius={50}
                containerBgColor="#311831"
                indicatorColor="#020617"
                textColor="#9CA3AF"
                activeTextColor="#FFFFFF"
              />
            </View>
            <ScrollView
              style={{ flexGrow: 1, maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {getList().length > 0 ? (
                getList().map((user: UserItem) => {
                  const isUnfollowed = activeTab === 'following' && unfollowedIds.has(user.id);
                  const rightLabel =
                    activeTab === 'requests' ? 'Onayla' : isUnfollowed ? 'Takip Et' : 'Takipten Çık';
                  const onRightPress =
                    activeTab === 'requests'
                      ? () => handleAcceptRequest(user)
                      : isUnfollowed
                        ? () => handleFollowPress(user.id)
                        : () => handleUnfollowPress(user.id, user.name);
                  return (
                    <UserListItem
                      key={user.id}
                      name={user.name}
                      subtitle={user.handle}
                      avatar={user.img}
                      onPress={() => {
                        setFollowListModalVisible(false);
                        (navigation.getParent() as any)?.navigate('UserProfile', {
                          userId: String(user.id),
                          name: user.name,
                          username: user.handle,
                          avatar: user.img,
                        });
                      }}
                      rightLabel={rightLabel}
                      rightVariant={activeTab === 'requests' ? 'primary' : 'outline'}
                      onRightPress={onRightPress}
                      nameColor="#FFFFFF"
                      subtitleColor="#9CA3AF"
                      rightButtonBorderColor="#9CA3AF"
                      rightButtonTextColor="#9CA3AF"
                    />
                  );
                })
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>Henüz kimse yok.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Profil',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
          rightIcon: 'cog',
          onRightPress: () => (navigation.getParent() as any)?.navigate('Settings'),
        }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}
        // Enable pull-to-refresh visibility (Android needs overscroll).
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        // iOS: allow pull even when content is short.
        alwaysBounceVertical
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
            // Keep spinner below the absolute header.
            progressViewOffset={insets.top + 60 + 12}
          />
        }
      >
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <Avatar
            source={avatarSource}
            size="xl"
            showBorder
          />
        </View>
        {profile.displayName ? (
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>{profile.displayName}</Text>
        ) : null}
        {profile.username ? (
          <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>@{profile.username}</Text>
        ) : null}
        {shouldShowAvatarWarning ? (
          <Text style={[typography.caption, { color: '#F59E0B', textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }]}>
            Uyarı: Profil fotoğrafınızın güncellenmesi için fotoğrafınızı tekrar seçip Kaydet yapın.
          </Text>
        ) : null}

        <View style={[styles.statsRow, { backgroundColor: '#311831', borderRadius: 50, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 0.5, borderColor: '#9CA3AF' }]}>
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowListModal('following')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{followCounts.following}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Takip Edilen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowListModal('followers')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{followCounts.followers}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={openDancedModal} activeOpacity={0.75}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{dancedWithList.length}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Dans Edilen</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: '100%', paddingHorizontal: spacing.lg, marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: '#311831',
                borderColor: colors.cardBorder,
                borderRadius: radius.xl,
                padding: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.md }]}>Profil bilgileri</Text>

            <ProfileInfoRow label="Ad" value={profileAd} />
            <ProfileInfoRow label="Soyad" value={profileSoyad} />
            <ProfileInfoRow label="Kullanıcı adı" value={profile.username ? `@${profile.username}` : ''} />
            <ProfileInfoRow label="E-posta" value={profile.email} />
            <ProfileInfoRow label="Hakkımda" value={profile.bio} multiline />
            {profile.otherInterests.trim() ? (
              <ProfileInfoRow label="Diğer ilgi alanları" value={profile.otherInterests} multiline />
            ) : null}

            <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: spacing.sm, marginTop: spacing.xs }]}>
              Favori danslar
            </Text>
            {profile.favoriteDances?.length ? (
              <View style={styles.tagsRow}>
                {profile.favoriteDances.map((dance) => (
                  <View key={dance} style={[styles.tag, { borderColor: 'rgba(255,255,255,0.12)' }]}>
                    <Icon name="music" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{dance}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[typography.caption, { color: '#9CA3AF' }]}>Henüz seçmedin.</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => (navigation.getParent() as any)?.navigate('EditProfile')}
          activeOpacity={0.8}
          style={[styles.editProfileBtn, { backgroundColor: '#4B154B', borderRadius: 50, marginTop: spacing.lg }]}
        >
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Profili düzenle</Text>
        </TouchableOpacity>

      </CollapsingHeaderScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  infoCard: {
    borderWidth: 1,
    width: '100%',
  },
  editProfileBtn: {
    width: '80%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '90%' },
  statItem: { flex: 1, alignItems: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    backgroundColor: '#311831',
    borderRadius: 9999,
  },
  dancedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dancedModalSheet: {
    paddingTop: 10,
  },
  dancedModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dancedModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dancedModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
