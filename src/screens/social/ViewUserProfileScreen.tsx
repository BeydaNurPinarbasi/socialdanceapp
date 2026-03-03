import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'UserProfile'>;

const CARD_BG = '#311831';
const CARD_BORDER = 'rgba(255,255,255,0.12)';

const INITIAL_STATS = { following: 24, followers: 18, danced: 12 };
const mockDances = ['Salsa', 'Bachata', 'Kizomba'];
const mockRecentEvents = [
  { id: '1', title: 'Latino Night', date: 'Cuma, 22:00' },
  { id: '2', title: 'Salsa Workshop', date: 'Perşembe, 19:00' },
];

export const ViewUserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { userId, name, username, avatar, bio } = route.params;
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);
  const displayBio = bio != null && bio !== '' ? bio : 'Bu kullanıcı henüz bir şey yazmamış.';

  const handleFollowToggle = () => {
    setIsFollowing((v) => {
      const next = !v;
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (next ? 1 : -1)) }));
      return next;
    });
  };

  return (
    <Screen>
      <Header title="" showBack />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <Avatar source={avatar} size="xl" showBorder />
          </View>
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>{name}</Text>
          {username != null && username !== '' && (
            <Text style={[typography.bodySmall, { color: '#9CA3AF', marginTop: 4 }]}>@{username.replace(/^@/, '')}</Text>
          )}
          <Text
            style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.sm }]}
          >
            {displayBio}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleFollowToggle}
              activeOpacity={0.8}
              style={[
                styles.followBtn,
                {
                  backgroundColor: isFollowing ? 'transparent' : colors.primary,
                  borderWidth: 1,
                  borderColor: isFollowing ? '#9CA3AF' : colors.primary,
                  borderRadius: 50,
                },
              ]}
            >
              <Text style={[typography.bodySmallBold, { color: isFollowing ? '#9CA3AF' : '#FFFFFF' }]}>
                {isFollowing ? 'Takipten Çık' : 'Takip Et'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  id: String(userId),
                  name,
                  avatar,
                  isNewChat: true,
                })
              }
              style={[
                styles.followBtn,
                { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 50, marginLeft: spacing.sm },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="message-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Mesaj</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statsRow, { backgroundColor: CARD_BG, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: CARD_BORDER }]}>
          <View style={styles.statItem}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{stats.following}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>Takip Edilen</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: CARD_BORDER }]} />
          <View style={styles.statItem}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{stats.followers}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>Takipçi</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: CARD_BORDER }]} />
          <View style={styles.statItem}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{stats.danced}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>Dans Edilen</Text>
          </View>
        </View>

        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>Favori danslar</Text>
        <View style={styles.tagsRow}>
          {mockDances.map((dance) => (
            <View key={dance} style={[styles.tag, { backgroundColor: CARD_BG, borderRadius: radius.full, borderWidth: 1, borderColor: CARD_BORDER }]}>
              <Icon name="music" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{dance}</Text>
            </View>
          ))}
        </View>

        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>Son katıldığı etkinlikler</Text>
        {mockRecentEvents.map((ev) => (
          <TouchableOpacity
            key={ev.id}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EventDetails', { id: ev.id })}
            style={[styles.eventCard, { backgroundColor: CARD_BG, borderRadius: radius.lg, borderWidth: 1, borderColor: CARD_BORDER, padding: spacing.md, marginBottom: spacing.sm }]}
          >
            <View style={styles.eventRow}>
              <View style={[styles.eventIconWrap, { backgroundColor: colors.primaryAlpha20 ?? 'rgba(238,42,238,0.2)', borderRadius: radius.md }]}>
                <Icon name="calendar-check" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{ev.title}</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{ev.date}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 24 },
  topSection: { alignItems: 'center' },
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  actionRow: { flexDirection: 'row', marginTop: 20 },
  followBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  eventCard: {},
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  eventIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
