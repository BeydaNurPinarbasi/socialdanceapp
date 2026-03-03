import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { MarketplaceProduct } from '../../context/MarketplaceContext';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const categories = ['Tümü', 'Ayakkabı', 'Kıyafet', 'Aksesuar'];

const sortOptions: { id: 'newest' | 'oldest' | 'price_asc' | 'price_desc'; label: string }[] = [
  { id: 'newest', label: 'En yeni' },
  { id: 'oldest', label: 'Eskiye göre' },
  { id: 'price_asc', label: 'Fiyat: Düşükten yükseğe' },
  { id: 'price_desc', label: 'Fiyat: Yüksekten düşüğe' },
];

function parsePrice(priceStr: string): number {
  return Number(String(priceStr).replace(/\D/g, '')) || 0;
}

export const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { products } = useMarketplace();
  const { colors, spacing, radius, typography } = useTheme();
  const [search, setSearch] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [category, setCategory] = useState('Tümü');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');

  const closeFilterSheet = () => setFilterSheetVisible(false);

  const clearFilters = () => {
    setCategory('Tümü');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  const filtered = useMemo(() => {
    let list = products.filter(
      (p) =>
        (!search || p.title.toLowerCase().includes(search.toLowerCase())) &&
        (category === 'Tümü' || p.category === category)
    );
    const min = parsePrice(minPrice);
    const max = parsePrice(maxPrice);
    if (min > 0 || max > 0) {
      list = list.filter((p) => {
        const price = parsePrice(p.price);
        if (min > 0 && price < min) return false;
        if (max > 0 && price > max) return false;
        return true;
      });
    }
    const sorted = [...list];
    if (sort === 'oldest') sorted.reverse();
    else if (sort === 'price_asc' || sort === 'price_desc') {
      sorted.sort((a: MarketplaceProduct, b: MarketplaceProduct) => {
        const pa = parsePrice(a.price);
        const pb = parsePrice(b.price);
        return sort === 'price_asc' ? pa - pb : pb - pa;
      });
    }
    return sorted;
  }, [products, search, category, minPrice, maxPrice, sort]);

  return (
    <Screen>
      <Header
        title="Marketplace"
        showBack
        onBackPress={() => navigation.goBack()}
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddProduct')}
      />
      <View style={[styles.searchRow, { paddingHorizontal: spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Ürün ara..." backgroundColor="#482347" />
        </View>
        <TouchableOpacity
          onPress={() => setFilterSheetVisible(true)}
          style={[styles.filterBtn, { backgroundColor: '#482347', borderRadius: radius.lg, marginLeft: spacing.md }]}
          activeOpacity={0.8}
        >
          <Icon name="filter-variant" size={22} color="#FFFFFF" />
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.sm }]}>Filtrele</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={closeFilterSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilterSheet} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 24, maxHeight: '85%' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[typography.label, { color: colors.textTertiary, marginBottom: spacing.sm }]}>Kategori</Text>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.sheetRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.body, { color: category === cat ? colors.primary : '#FFFFFF' }]}>{cat}</Text>
                  {category === cat && <Icon name="check" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}

              <Text style={[typography.label, { color: colors.textTertiary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Fiyat (₺)</Text>
              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Min"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                    backgroundColor="#311831"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Max"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                    backgroundColor="#311831"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              <Text style={[typography.label, { color: colors.textTertiary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Sıralama</Text>
              {sortOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setSort(opt.id)}
                  style={[styles.sheetRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.body, { color: sort === opt.id ? colors.primary : '#FFFFFF' }]}>{opt.label}</Text>
                  {sort === opt.id && <Icon name="check" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}

              <View style={[styles.sheetActions, { marginTop: spacing.xl }]}>
                <TouchableOpacity onPress={clearFilters} style={[styles.sheetActionBtn, { borderWidth: 1, borderColor: colors.borderLight }]} activeOpacity={0.8}>
                  <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Temizle</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeFilterSheet} style={[styles.sheetActionBtn, { backgroundColor: colors.primary, marginLeft: 12 }]} activeOpacity={0.8}>
                  <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: spacing.md, marginBottom: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.images?.[0] ?? '' }}
                style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
                contentFit="cover"
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                transition={200}
              />
              <View style={styles.titleOverlay}>
                <Text style={[typography.bodySmallBold, styles.titleOverlayText]} numberOfLines={2}>{item.title}</Text>
                <Text style={[typography.bodySmallBold, styles.priceOverlayText]}>{item.price}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sheetActions: { flexDirection: 'row' },
  sheetActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: { flex: 1, maxWidth: '48%', overflow: 'hidden' },
  imageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
  },
  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  titleOverlayText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  priceOverlayText: {
    color: '#FFFFFF',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
