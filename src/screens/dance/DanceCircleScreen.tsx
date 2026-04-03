import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import { danceCircleService, DanceCircleCandidate } from '../../services/api/danceCircle';
import { hasSupabaseConfig } from '../../services/api/apiClient';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const CARD_WIDTH = Dimensions.get('window').width - 40;
const SWIPE_THRESHOLD = 120;

export const DanceCircleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { spacing, colors, radius, typography } = useTheme();
  const [candidates, setCandidates] = useState<DanceCircleCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);
  const [resetting, setResetting] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();
  const current = candidates[index];
  const next = candidates[index + 1];

  const loadCandidates = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (!hasSupabaseConfig()) {
      setError('Supabase yapılandırması eksik.');
      setCandidates([]);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const rows = await danceCircleService.listCandidates();
      setCandidates(rows);
      setIndex(0);
      setLikedCount(0);
      setDislikedCount(0);
      pan.setValue({ x: 0, y: 0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dans listesi yüklenemedi.';
      setError(msg);
      setCandidates([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const cardRotate = pan.x.interpolate({
    inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const sendToNextCard = useCallback((direction: 'left' | 'right') => {
    if (!current) return;
    const toX = direction === 'right' ? CARD_WIDTH * 1.3 : -CARD_WIDTH * 1.3;
    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      void danceCircleService.submitVote(current.id, direction === 'right' ? 'like' : 'skip');
      if (direction === 'right') setLikedCount((v) => v + 1);
      if (direction === 'left') setDislikedCount((v) => v + 1);
      pan.setValue({ x: 0, y: 0 });
      setIndex((v) => v + 1);
    });
  }, [current, pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > SWIPE_THRESHOLD) {
            sendToNextCard('right');
            return;
          }
          if (g.dx < -SWIPE_THRESHOLD) {
            sendToNextCard('left');
            return;
          }
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
        },
      }),
    [pan, sendToNextCard],
  );

  const handleResetVotes = useCallback(async () => {
    if (!hasSupabaseConfig()) return;
    setResetting(true);
    try {
      const { deleted, hadVotesBefore } = await danceCircleService.resetMyVotes();
      await loadCandidates({ showLoading: false });
      if (deleted > 0) {
        Alert.alert('Tamam', `${deleted} oy sıfırlandı, liste yenilendi.`);
      } else {
        Alert.alert('Bilgi', 'Sunucuda kayıtlı Dance Circle oyunuz yok. Liste yenilendi.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sıfırlanamadı.';
      Alert.alert(
        'Sıfırlanamadı',
        `${msg}\n\nSupabase’de dance_circle_votes için DELETE RLS politikası gerekir. Yerelde: supabase db push veya migration’ı uzak projeye uygulayın.`,
      );
    } finally {
      setResetting(false);
    }
  }, [loadCandidates]);

  return (
    <Screen>
      <Header
        title="Dance Circle"
        showBack={false}
        showMenu
        onMenuPress={openDrawer}
        showNotification
        onNotificationPress={() => (navigation.getParent() as any)?.navigate('Notifications')}
      />

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => void loadCandidates()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Sağa kaydır: dans ettim • Sola kaydır: dans etmedim
        </Text>
        <View style={[styles.hintRow, { marginBottom: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textTertiary, flex: 1 }]}>
            Dans ettim: {likedCount} · Dans etmedim: {dislikedCount}
          </Text>
          <TouchableOpacity
            onPress={() => void handleResetVotes()}
            disabled={resetting}
            activeOpacity={0.8}
            style={[styles.resetBtn, { borderColor: 'rgba(255,255,255,0.25)', borderRadius: radius.full }]}
          >
            {resetting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[typography.captionBold, { color: colors.primary }]}>Sıfırla</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {next ? (
            <View style={[styles.cardBase, styles.nextCard, { borderRadius: radius.xl, backgroundColor: colors.headerBg }]}>
              {next.avatar.trim() ? (
                <Image source={{ uri: next.avatar }} style={styles.image} />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryAlpha30 }]}>
                  <Icon name="account" size={88} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.gradientOverlay} />
            </View>
          ) : null}

          {current ? (
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.cardBase,
                {
                  borderRadius: radius.xl,
                  backgroundColor: colors.headerBg,
                  transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: cardRotate }],
                },
              ]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.95}
                onPress={() =>
                  navigation.navigate('UserProfile', {
                    userId: current.id,
                    name: current.name,
                    username: current.username,
                    avatar: current.avatar,
                    bio: current.bio,
                  })
                }
              >
                {current.avatar.trim() ? (
                  <Image source={{ uri: current.avatar }} style={styles.image} />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryAlpha30 }]}>
                    <Icon name="account" size={96} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.gradientOverlay} />
                <View style={styles.swipeLabelOverlay} pointerEvents="none">
                  <Animated.View style={[styles.swipeLabelCenterWrap, { opacity: likeOpacity }]}>
                    <View style={[styles.swipeLabelBadge, styles.swipeLabelLikeBorder]}>
                      <Icon name="thumb-up" size={22} color="#34D399" />
                      <Text style={styles.edgeLabelLike}>Dans ettim</Text>
                    </View>
                  </Animated.View>
                  <Animated.View style={[styles.swipeLabelCenterWrap, { opacity: nopeOpacity }]}>
                    <View style={[styles.swipeLabelBadge, styles.swipeLabelNopeBorder]}>
                      <Icon name="close" size={24} color="#F87171" />
                      <Text style={styles.edgeLabelNope}>Dans etmedim</Text>
                    </View>
                  </Animated.View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={[typography.h3, { color: '#FFFFFF' }]}>{current.name}</Text>
                  <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginTop: 4 }]}>
                    @{current.username} · {current.city} · {current.level}
                  </Text>
                  <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.95)', marginTop: 10 }]}>
                    Hakkında
                  </Text>
                  <Text style={[typography.bodySmall, { color: '#FFFFFF', marginTop: 4 }]}>{current.bio}</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 10 }]}>
                    {current.danceStyles.join(' • ')}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <EmptyState icon="heart-outline" title="Şimdilik gösterilecek profil yok. Yukarıdaki Sıfırla ile oyları temizleyebilirsin." />
          )}
        </View>

        {current ? <View style={{ marginBottom: spacing.md + insets.bottom }} /> : null}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: 500,
    overflow: 'visible',
    alignSelf: 'center',
  },
  nextCard: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  cardContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  swipeLabelOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  swipeLabelCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 2.5,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.82)',
    maxWidth: CARD_WIDTH - 48,
  },
  swipeLabelLikeBorder: {
    borderColor: '#34D399',
  },
  swipeLabelNopeBorder: {
    borderColor: '#F87171',
  },
  edgeLabelLike: {
    color: '#34D399',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  edgeLabelNope: {
    color: '#F87171',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

