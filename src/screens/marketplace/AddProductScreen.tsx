import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FilterBar } from '../../components/domain/FilterBar';
import { Icon } from '../../components/ui/Icon';

const categories = ['Ayakkabı', 'Kıyafet', 'Aksesuar', 'Diğer'];

export const AddProductScreen: React.FC = () => {
  const navigation = useNavigation();
  const { spacing, colors, radius, typography } = useTheme();
  const [category, setCategory] = React.useState('Ayakkabı');
  const [productImageUri, setProductImageUri] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [errors, setErrors] = React.useState<{ photo?: string; title?: string; price?: string; description?: string }>({});
  const scrollRef = React.useRef<ScrollView | null>(null);

  const handlePublish = () => {
    const photoMissing = !productImageUri;
    const titleEmpty = !title.trim();
    const priceEmpty = !price.trim();
    const descriptionEmpty = !description.trim();
    if (photoMissing || titleEmpty || priceEmpty || descriptionEmpty) {
      setErrors({
        photo: photoMissing ? 'Ürün fotoğrafı ekleyin' : undefined,
        title: titleEmpty ? 'Ürün adı zorunludur' : undefined,
        price: priceEmpty ? 'Fiyat zorunludur' : undefined,
        description: descriptionEmpty ? 'Açıklama zorunludur' : undefined,
      });
      Alert.alert('Eksik bilgi', 'Lütfen tüm alanları doldurun ve bir fotoğraf ekleyin.');
      return;
    }
    setErrors({});
    navigation.goBack();
  };

  const openGallery = () => {
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
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setProductImageUri(result.assets[0].uri);
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
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setProductImageUri(result.assets[0].uri);
        }
      } catch (err: unknown) {
        const message = String(err instanceof Error ? err.message : err);
        if (/cancel|Cancel|User cancelled/i.test(message)) return;
        Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    }, 0);
  };

  return (
    <Screen>
      <Header title="Ürün Ekle" showBack />
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
          <TouchableOpacity
            onPress={openGallery}
            activeOpacity={0.9}
            style={[
              styles.photoArea,
              {
                backgroundColor: productImageUri ? 'transparent' : (colors.surfaceSecondary ?? '#eee'),
                borderRadius: radius.lg ?? 16,
                marginBottom: spacing.lg,
                borderWidth: productImageUri ? 0 : 1,
                borderColor: errors.photo ? colors.error : colors.borderLight,
              },
            ]}
          >
            {productImageUri ? (
              <Image source={{ uri: productImageUri }} style={[styles.previewImage, { borderRadius: radius.lg ?? 16 }]} resizeMode="cover" />
            ) : (
              <>
                <Icon name="image-outline" size={40} color={errors.photo ? colors.error : colors.textTertiary} style={{ marginBottom: spacing.sm }} />
                <Button title="Galeriden fotoğraf ekle" variant="outline" size="sm" onPress={openGallery} icon="image-outline" />
              </>
            )}
          </TouchableOpacity>
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
          <Button title="Yayınla" onPress={handlePublish} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
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
  previewImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});
