import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FilterBar } from '../../components/domain/FilterBar';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

const categories = ['Ayakkabı', 'Kıyafet', 'Aksesuar', 'Diğer'];

export const AddProductScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParamList, 'AddProduct'>>();
  const productId = route.params?.productId;
  const isEdit = !!productId;
  const { addProduct, getProductById, updateProduct } = useMarketplace();
  const { profile, avatarSource } = useProfile();
  const { spacing, colors, radius, typography } = useTheme();
  const [category, setCategory] = React.useState('Ayakkabı');
  const [productImages, setProductImages] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [errors, setErrors] = React.useState<{ photo?: string; title?: string; price?: string; description?: string }>({});
  const scrollRef = React.useRef<ScrollView | null>(null);

  useEffect(() => {
    if (productId) {
      const product = getProductById(productId);
      if (product) {
        setTitle(product.title);
        setPrice(product.price.replace(/^₺/, ''));
        setCategory(product.category);
        setDescription(product.description);
        setProductImages(Array.isArray(product.images) ? [...product.images] : []);
      }
    }
  }, [productId, getProductById]);

  const handlePublish = () => {
    const photoMissing = productImages.length === 0;
    const titleEmpty = !title.trim();
    const priceEmpty = !price.trim();
    const descriptionEmpty = !description.trim();
    if (photoMissing || titleEmpty || priceEmpty || descriptionEmpty) {
      setErrors({
        photo: photoMissing ? 'En az bir ürün fotoğrafı ekleyin' : undefined,
        title: titleEmpty ? 'Ürün adı zorunludur' : undefined,
        price: priceEmpty ? 'Fiyat zorunludur' : undefined,
        description: descriptionEmpty ? 'Açıklama zorunludur' : undefined,
      });
      Alert.alert('Eksik bilgi', 'Lütfen tüm alanları doldurun ve en az bir fotoğraf ekleyin.');
      return;
    }
    setErrors({});
    const priceFormatted = price.trim().startsWith('₺') ? price.trim() : `₺${price.trim()}`;
    if (isEdit && productId) {
      updateProduct(productId, {
        title: title.trim(),
        price: priceFormatted,
        images: productImages,
        category,
        description: description.trim(),
      });
      navigation.goBack();
    } else {
      addProduct({
        title: title.trim(),
        price: priceFormatted,
        images: productImages,
        category,
        description: description.trim(),
        sellerId: profile.username,
        sellerName: profile.displayName,
        sellerAvatar: avatarSource,
      });
      navigation.replace('Marketplace');
    }
  };

  const openGallery = (isFirst: boolean) => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        Alert.alert('Hata', 'Galeri açılamadı. Lütfen tekrar deneyin.');
        return;
      }
      if (!ImagePicker?.launchImageLibraryAsync) return;
      try {
        const getPerm = ImagePicker.getMediaLibraryPermissionsAsync ?? ImagePicker.requestMediaLibraryPermissionsAsync;
        const { status: existingStatus } = await getPerm();
        if (existingStatus === 'granted') {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: isFirst,
            aspect: isFirst ? [4, 3] : undefined,
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setProductImages((prev) => [...prev, result.assets![0].uri]);
          }
          return;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Galeri izni gerekli',
            'Ürün fotoğrafı için Ayarlar > Bu uygulama > İzinler bölümünden Fotoğraflar iznini verin.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: isFirst,
          aspect: isFirst ? [4, 3] : undefined,
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setProductImages((prev) => [...prev, result.assets![0].uri]);
        }
      } catch (err: unknown) {
        const message = String(err instanceof Error ? err.message : err);
        if (/cancel|Cancel|User cancelled/i.test(message)) return;
        Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    }, 0);
  };

  const removeImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Screen>
      <Header title={isEdit ? 'Ürünü Düzenle' : 'Ürün Ekle'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: spacing.lg }}>
            {productImages.length > 0 ? (
              <>
                <View style={styles.mainPreviewWrap}>
                  <Image source={{ uri: productImages[0] }} style={[styles.previewImage, { borderRadius: radius.lg ?? 16 }]} resizeMode="cover" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }} contentContainerStyle={styles.thumbRow}>
                  {productImages.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                      <TouchableOpacity onPress={() => removeImage(index)} style={styles.removeThumb} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="close-circle" size={24} color={colors.error} />
                      </TouchableOpacity>
                      <Image source={{ uri }} style={[styles.thumbImage, { borderRadius: radius.sm ?? 8 }]} resizeMode="cover" />
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => openGallery(false)}
                    style={[styles.addThumbBtn, { backgroundColor: colors.surfaceSecondary ?? '#2a1a2b', borderColor: errors.photo ? colors.error : colors.borderLight, borderRadius: radius.sm ?? 8 }]}
                  >
                    <Icon name="plus" size={28} color={colors.textTertiary} />
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => openGallery(true)}
                activeOpacity={0.9}
                style={[
                  styles.photoArea,
                  {
                    backgroundColor: colors.surfaceSecondary ?? '#eee',
                    borderRadius: radius.lg ?? 16,
                    borderWidth: 1,
                    borderColor: errors.photo ? colors.error : colors.borderLight,
                  },
                ]}
              >
                <Icon name="image-outline" size={40} color={errors.photo ? colors.error : colors.textTertiary} style={{ marginBottom: spacing.sm }} />
                <Button title="Galeriden fotoğraf ekle" variant="outline" size="sm" onPress={() => openGallery(true)} icon="image-outline" />
              </TouchableOpacity>
            )}
          </View>
          {errors.photo ? (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.caption, { color: colors.error }]}>{errors.photo}</Text>
            </View>
          ) : null}
          <Input
            label="Ürün adı"
            placeholder="Örn: Salsa ayakkabısı"
            value={title}
            onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: undefined })); }}
            error={errors.title}
            required
          />
          <View style={{ marginTop: spacing.lg }}>
            <Input
              label="Fiyat (₺)"
              placeholder="0"
              keyboardType="numeric"
              value={price}
              onChangeText={(t) => { setPrice(t); setErrors((e) => ({ ...e, price: undefined })); }}
              error={errors.price}
              required
            />
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <FilterBar filters={categories} activeFilter={category} onFilterChange={setCategory} />
          </View>
          <Input
            label="Açıklama"
            placeholder="Ürün detayları..."
            containerStyle={{ marginTop: spacing.lg }}
            multiline
            value={description}
            onChangeText={(t) => { setDescription(t); setErrors((e) => ({ ...e, description: undefined })); }}
            error={errors.description}
            required
            onFocus={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          />
          <Button title={isEdit ? 'Güncelle' : 'Yayınla'} onPress={handlePublish} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  photoArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPreviewWrap: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  thumbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  thumbWrap: { position: 'relative', marginRight: 8 },
  removeThumb: { position: 'absolute', top: 4, right: 4, zIndex: 1 },
  thumbImage: { width: 64, height: 64 },
  addThumbBtn: { width: 64, height: 64, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
