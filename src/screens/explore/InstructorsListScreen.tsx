import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { mockFollowing } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import {
  cardRowsFromExploreInstructors,
  instructorProfileService,
  InstructorCardRow,
} from '../../services/api/instructorProfile';

type Props = NativeStackScreenProps<MainStackParamList, 'InstructorsList'>;

export const InstructorsListScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [rows, setRows] = useState<InstructorCardRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setRows(
        mockFollowing.map((m) => ({
          key: `mock-${m.id}`,
          title: m.name,
          subtitle: m.handle,
          avatarUrl: m.img,
          userId: `mock-instructor-${m.id}`,
          navigateName: m.name,
          navigateUsername: m.handle.replace(/^@/, ''),
        })),
      );
      return;
    }
    const list = await instructorProfileService.listVisibleForExplore();
    setRows(cardRowsFromExploreInstructors(list));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => setRows([]));
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load()
      .catch(() => setRows([]))
      .finally(() => setRefreshing(false));
  }, [load]);

  return (
    <Screen>
      <Header title="Eğitmenler" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          hasSupabaseConfig() ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {rows.length === 0 && hasSupabaseConfig() ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            Henüz görünür eğitmen yok veya liste yüklenemedi. Giriş yaptığınızdan ve eğitmen profilinizde &quot;Keşfette görünür&quot; açık
            olduğundan emin olun.
          </Text>
        ) : null}
        {rows.map((instructor) => (
          <TouchableOpacity
            key={instructor.key}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('UserProfile', {
                userId: instructor.userId,
                name: instructor.navigateName,
                username: instructor.navigateUsername || undefined,
                avatar: instructor.avatarUrl ?? '',
                bio: instructor.navigateBio,
              })
            }
            style={{ marginBottom: spacing.md }}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: '#341A32',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: radius.xl,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
                ]}
              >
                {instructor.avatarUrl ? (
                  <Image source={{ uri: instructor.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Icon name="account" size={18} color={colors.primary} />
                )}
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{instructor.title}</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{instructor.subtitle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
