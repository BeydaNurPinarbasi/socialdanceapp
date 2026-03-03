import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { Icon } from '../../components/ui/Icon';
import { mockSchools } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { School } from '../../types/models';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const ISTANBUL_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const HEADER_HEIGHT = 60;
const HEADER_EXTRA_HEIGHT = 90;

export const SchoolsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const isMapView = viewMode === 'map';
  const mapHeight = windowHeight;

  useEffect(() => {
    navigation.setParams({ isMapView } as any);
  }, [navigation, isMapView]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const filtered = mockSchools.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Screen edges={isMapView ? [] : ['top']}>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Dans Okulları',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
          rightIcon: 'map-outline',
          onRightPress: () => setViewMode('map'),
          transparent: isMapView,
        }}
        headerExtra={
          <View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Okul veya konum ara"
              backgroundColor={isMapView ? 'transparent' : '#482347'}
            />
          </View>
        }
        hideHeader={isMapView}
        overlayContent={isMapView}
        headerBackgroundColor={isMapView ? 'transparent' : undefined}
        contentContainerStyle={{
          paddingHorizontal: viewMode === 'list' ? spacing.lg : 0,
          paddingBottom: viewMode === 'list' ? 100 : 0,
        }}
      >
        {viewMode === 'list' ? (
          filtered.map((school, index) => (
            <View
              key={school.id}
              style={{
                marginBottom: spacing.lg,
                marginTop: index === 0 ? -spacing.md : 0,
              }}
            >
              <SchoolCard
                school={school as School}
                onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                cardBackgroundColor="#281328"
              />
            </View>
          ))
        ) : (
          <View style={[styles.mapWrap, { height: mapHeight }]}>
            <MapView
              style={styles.map}
              initialRegion={ISTANBUL_REGION}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {filtered.map((school) =>
                school.latitude != null && school.longitude != null ? (
                  <Marker
                    key={school.id}
                    coordinate={{ latitude: school.latitude, longitude: school.longitude }}
                    title={school.name}
                    description={school.location}
                    onCalloutPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                  />
                ) : null,
              )}
            </MapView>
          </View>
        )}
      </CollapsingHeaderScrollView>

      {isMapView && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setViewMode('list')}
          style={[styles.listFab, { top: insets.top + 8, left: spacing.lg }]}
        >
          <Icon name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {!isMapView && (
        <View style={[styles.fab, { right: spacing.lg, bottom: 1 }]}>
          <TouchableOpacity
            onPress={() => (navigation.getParent() as any)?.navigate('EditClass', {})}
            activeOpacity={0.9}
            style={[styles.fabButton, { backgroundColor: colors.primary }]}
          >
            <Icon name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  listFab: {
    position: 'absolute',
    zIndex: 11,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  mapWrap: {
    flex: 1,
    minHeight: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fab: { position: 'absolute', zIndex: 10 },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
