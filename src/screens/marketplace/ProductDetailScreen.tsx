import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { useCart } from '../../context/CartContext';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ProductDetail'>;

const seller = {
  id: 'seller-1',
  name: 'Satıcı',
  avatar: 'https://i.pravatar.cc/150?u=seller',
};

const PRODUCTS: Record<string, { id: string; title: string; price: string; image: string; description: string }> = {
  '1': {
    id: '1',
    title: 'Salsa Ayakkabısı',
    price: '₺450',
    image: 'https://picsum.photos/seed/salsa-shoe/300/200',
    description: 'Profesyonel salsa ayakkabısı, az kullanılmış. Numara 38.',
  },
  '2': {
    id: '2',
    title: 'Bachata Eteği',
    price: '₺280',
    image: 'https://picsum.photos/seed/dance-skirt/300/200',
    description: 'Dans için özel tasarım bachata eteği. Rahat hareket imkânı.',
  },
  '3': {
    id: '3',
    title: 'Tango Pabuç',
    price: '₺520',
    image: 'https://picsum.photos/seed/tango-shoe/300/200',
    description: 'Klasik tango pabuç, topuklu. Numara 37.',
  },
};

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { addItem } = useCart();
  const [addedModalVisible, setAddedModalVisible] = useState(false);

  const product = PRODUCTS[route.params.id] ?? PRODUCTS['1'];

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
    });
    setAddedModalVisible(true);
  };

  const openChatWithSeller = () => {
    navigation.navigate('ChatDetail', {
      id: seller.id,
      name: seller.name,
      avatar: seller.avatar,
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
      <Header title="Marketplace" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: product.image }}
          style={[styles.image, { backgroundColor: colors.surfaceSecondary }]}
        />
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
