import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { useCart } from '../../context/CartContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useProfile } from '../../context/ProfileContext';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ProductDetail'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { profile } = useProfile();
  const { getProductById, products, removeProduct } = useMarketplace();
  const [addedModalVisible, setAddedModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const fullscreenScrollRef = useRef<ScrollView>(null);
  const mainImageScrollRef = useRef<ScrollView>(null);

  const product = getProductById(route.params.id) ?? products[0];
  const seller = product ? { id: product.sellerId, name: product.sellerName, avatar: product.sellerAvatar } : null;
  const images: string[] = Array.isArray(product?.images) ? product.images : [];

  useEffect(() => {
    if (fullscreenVisible && fullscreenScrollRef.current && images.length > 0) {
      const timeout = setTimeout(() => {
        fullscreenScrollRef.current?.scrollTo({
          x: selectedImageIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [fullscreenVisible, selectedImageIndex, images.length]);

  if (!product || !seller) {
    return null;
  }

  const isOwnProduct = profile.username === product.sellerId;

  const handleRemoveProduct = () => {
    setOptionsSheetVisible(false);
    setRemoveConfirmVisible(true);
  };

  const confirmRemove = () => {
    removeProduct(product.id);
    setRemoveConfirmVisible(false);
    navigation.goBack();
  };

  const handleEdit = () => {
    setOptionsSheetVisible(false);
    navigation.navigate('AddProduct', { productId: product.id });
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: images[0] ?? '',
    });
    setAddedModalVisible(true);
  };

  const openChatWithSeller = () => {
    navigation.navigate('ChatDetail', {
      id: product.sellerId,
      name: product.sellerName,
      avatar: product.sellerAvatar,
      isNewChat: true,
    });
  };

  return (
    <Screen>
      <ConfirmModal
        visible={addedModalVisible}
        title="Sepetinize eklendi"
        message="Ürün sepetinize eklendi. Drawer menüsünden Sepet sayfasına giderek görüntüleyebilirsiniz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAddedModalVisible(false)}
        onConfirm={() => setAddedModalVisible(false)}
      />
      <ConfirmModal
        visible={removeConfirmVisible}
        title="Ürünü kaldır"
        message="Bu ürünü kaldırmak istediğinize emin misiniz?"
        confirmLabel="Kaldır"
        onCancel={() => setRemoveConfirmVisible(false)}
        onConfirm={confirmRemove}
      />
      <Header
        title="Marketplace"
        showBack
        rightIcon={isOwnProduct ? 'dots-vertical' : undefined}
        onRightPress={isOwnProduct ? () => setOptionsSheetVisible(true) : undefined}
      />

      <Modal visible={optionsSheetVisible} transparent animationType="slide" onRequestClose={() => setOptionsSheetVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOptionsSheetVisible(false)} />
          <View style={[styles.optionsSheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <TouchableOpacity onPress={handleEdit} style={[styles.optionRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]} activeOpacity={0.7}>
              <Icon name="pencil-outline" size={22} color="#9CA3AF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.md }]}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemoveProduct} style={[styles.optionRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]} activeOpacity={0.7}>
              <Icon name="delete-outline" size={22} color={colors.error} />
              <Text style={[typography.body, { color: colors.error, marginLeft: spacing.md }]}>Kaldır</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {images.length > 0 && (
          <TouchableOpacity activeOpacity={1} onPress={() => setFullscreenVisible(true)}>
            <ScrollView
              ref={mainImageScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                );
                if (!Number.isNaN(index)) {
                  setSelectedImageIndex(index);
                }
              }}
            >
              {images.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={[
                    styles.image,
                    { backgroundColor: colors.surfaceSecondary, width: SCREEN_WIDTH },
                  ]}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        )}

        <Modal visible={fullscreenVisible} transparent animationType="fade" onRequestClose={() => setFullscreenVisible(false)}>
          <View style={styles.fullscreenOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFullscreenVisible(false)} />
            <ScrollView
              ref={fullscreenScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                );
                if (!Number.isNaN(index)) setSelectedImageIndex(index);
              }}
              style={styles.fullscreenScroll}
            >
              {images.map((uri, index) => (
                <Image
                  key={`fs-${uri}-${index}`}
                  source={{ uri }}
                  style={[styles.fullscreenImage, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </Modal>
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.thumbStrip, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}
          >
            {images.map((uri, index) => (
              <TouchableOpacity
                key={`${uri}-${index}`}
                onPress={() => {
                  setSelectedImageIndex(index);
                  mainImageScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                }}
                style={[
                  styles.thumbFrame,
                  { borderColor: selectedImageIndex === index ? colors.primary : 'transparent', borderWidth: 2, borderRadius: radius.sm ?? 8 },
                ]}
              >
                <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.h3, { color: '#FFFFFF' }]}>{product.title}</Text>
          <Text style={[typography.h4, { color: colors.primary, marginTop: spacing.sm }]}>{product.price}</Text>

          <View style={[styles.sellerRow, { marginTop: spacing.xl, padding: spacing.md, backgroundColor: '#482347', borderRadius: radius.lg }]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile', { userId: seller.id, name: seller.name, avatar: seller.avatar })}
              style={styles.sellerInfo}
              activeOpacity={0.7}
            >
              <Avatar source={seller.avatar} size="md" />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.md }]}>{seller.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openChatWithSeller}
              style={[styles.mesajBtn, { borderColor: '#9CA3AF', borderRadius: radius.full }]}
              activeOpacity={0.7}
            >
              <Text style={[typography.captionBold, { color: '#9CA3AF' }]}>Mesaj</Text>
            </TouchableOpacity>
          </View>

          <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xl }]}>
            {product.description}
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.borderLight, padding: spacing.lg }]}>
        <Button title="Sepete Ekle" onPress={handleAddToCart} fullWidth />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  fullscreenScroll: { flex: 1 },
  fullscreenImage: {},
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsSheetBox: { paddingTop: 12, paddingHorizontal: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  thumbStrip: { flexDirection: 'row' },
  thumbFrame: { marginRight: 8, overflow: 'hidden' },
  thumbImage: { width: 56, height: 56 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  mesajBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
});
