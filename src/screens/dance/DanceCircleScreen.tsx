import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockFavoritesEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const DanceCircleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { spacing } = useTheme();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [events] = useState(mockFavoritesEvents);
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(
    () => new Set(events.filter((e) => e.isFavorite).map((e) => e.id as number))
  );

  const toggleFavorite = (id: number) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = events.filter((e) => {
    if (activeTab === 'favorites' && !favoritedIds.has(e.id as number)) return false;
    if (activeTab === 'history' && !e.isPast) return false;
    return true;
  });

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Etkinliklerim',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        headerExtra={
          <View>
            <TabSwitch
              tabs={[
                { key: 'favorites', label: 'Favorilerim' },
                { key: 'history', label: 'Geçmiş Etkinlikler' },
              ]}
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as any)}
            />
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      >
        <View style={{ marginTop: -56 }}>
          {filtered.length > 0 ? (
            filtered.map((event) => (
              <View key={event.id} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={{
                    id: event.id,
                    title: event.title,
                    location: event.location,
                    date: event.date,
                    day: event.day,
                    month: event.month,
                    image: event.image ?? 'https://picsum.photos/seed/event/400/280',
                    isFavorite: favoritedIds.has(event.id as number),
                    isPopular: event.isPopular,
                    attendees: event.attendees,
                    attendeeAvatars: event.attendeeAvatars,
                    isDanceStar: event.isDanceStar,
                  }}
                  onPress={() => navigation.navigate('EventDetails', { id: String(event.id), fromFavorites: true })}
                  onFavoritePress={() => toggleFavorite(event.id as number)}
                  onReservationPress={() => navigation.navigate('EventDetails', { id: String(event.id), fromFavorites: true })}
                  onAvatarPress={(index, avatarUri) =>
                    (navigation.getParent() as any)?.navigate('UserProfile', {
                      userId: `ev-${event.id}-${index}`,
                      name: `Dansçı ${index + 1}`,
                      avatar: avatarUri,
                    })
                  }
                />
              </View>
            ))
          ) : (
            <EmptyState icon="calendar-blank-outline" title="Bu filtreye uygun etkinlik yok." />
          )}
        </View>
      </CollapsingHeaderScrollView>
    </Screen>
  );
};

