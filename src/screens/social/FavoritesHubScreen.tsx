import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { useTheme } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockFavoritesEvents } from '../../constants/mockData';
import { listFavoriteSchoolIds } from '../../services/api/favorites';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'FavoritesHub'>;

export const FavoritesHubScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteSchoolCount, setFavoriteSchoolCount] = useState<number | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  const favoriteEventsCount = useMemo(
    () => mockFavoritesEvents.filter((e) => e.isFavorite).length,
    [],
  );

  const load = useCallback(async () => {
    setSchoolError(null);
    try {
      const ids = await listFavoriteSchoolIds();
      setFavoriteSchoolCount(ids.length);
    } catch (e: any) {
      setFavoriteSchoolCount(0);
      setSchoolError(e?.message || 'Favoriler yüklenemedi');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const CardRow = ({
    title,
    subtitle,
    icon,
    onPress,
  }: {
    title: string;
    subtitle: string;
    icon: any;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: '#311831',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(238,43,238,0.16)',
        }}
      >
        <Icon name={icon} size={22} color="#EE2AEE" />
      </View>
      <View style={{ marginLeft: spacing.md, flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );

  return (
    <Screen>
      <Header title="Favoriler" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.label, { color: '#FFFFFF', marginLeft: spacing.sm, marginBottom: spacing.sm }]}>
          Kategoriler
        </Text>

        <View style={{ gap: spacing.md }}>
          <CardRow
            title="Favori Okullar"
            subtitle={
              schoolError
                ? schoolError
                : favoriteSchoolCount == null
                  ? 'Yükleniyor...'
                  : `${favoriteSchoolCount} okul`
            }
            icon="school-outline"
            onPress={() => navigation.navigate('FavoriteSchools')}
          />

          <CardRow
            title="Favori Etkinlikler"
            subtitle={`${favoriteEventsCount} etkinlik`}
            icon="heart-outline"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Favorites' })}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <EmptyState icon="heart-outline" title="Favoriler burada toplanır." subtitle="Okul veya etkinlikleri favoriye ekledikçe bu sayfa dolacak." />
        </View>
      </ScrollView>
    </Screen>
  );
};

