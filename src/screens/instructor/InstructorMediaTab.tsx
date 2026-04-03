import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { instructorMediaService, InstructorMediaItem } from '../../services/api/instructorMedia';

const NUM_COLUMNS = 3;
const GAP = 8;

export const InstructorMediaTab: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPad = spacing.lg;
  const tileSize =
    (windowWidth - horizontalPad * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const [items, setItems] = useState<InstructorMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorMediaItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorMediaService.listMine();
      setItems(list);
    } catch (e: unknown) {
      setItems([]);
      setErrorBanner(e instanceof Error ? e.message : 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openPickerAndUpload = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        setErrorBanner(
          'Galeri bu ortamda kullanılamıyor. Fotoğraflar iznini kontrol edin veya native build deneyin.',
        );
        return;
      }
      try {
        if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorBanner('Fotoğraf eklemek için galeri izni gerekir.');
          return;
        }
        if (!ImagePicker?.launchImageLibraryAsync) return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setUploading(true);
        setErrorBanner(null);
        const created = await instructorMediaService.addFromLocalUri(result.assets[0].uri);
        setItems((prev) => [created, ...prev]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel|User cancelled/i.test(msg)) return;
        setErrorBanner(msg || 'Yükleme başarısız.');
      } finally {
        setUploading(false);
      }
    }, 0);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setRemovingId(deleteTarget.id);
    setErrorBanner(null);
    try {
      await instructorMediaService.remove(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Silinemedi.');
    } finally {
      setRemovingId(null);
      setDeleteTarget(null);
    }
  };

  const atLimit = items.length >= instructorMediaService.maxItems;

  if (loading && items.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? { gap: GAP, marginBottom: GAP } : undefined}
        contentContainerStyle={{
          padding: horizontalPad,
          paddingBottom: spacing.xxl,
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            {errorBanner ? (
              <Text style={[typography.caption, { color: colors.orange, marginBottom: spacing.sm }]}>
                {errorBanner}
              </Text>
            ) : null}
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Keşfette görünürken profilinizi destekleyecek fotoğraflar ekleyin (en fazla {instructorMediaService.maxItems}{' '}
              adet).
            </Text>
            <Button
              title={uploading ? 'Yükleniyor…' : 'Galeriden fotoğraf ekle'}
              onPress={() => void openPickerAndUpload()}
              loading={uploading}
              disabled={uploading || atLimit}
              fullWidth
            />
            {atLimit ? (
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                Limit doldu. Yeni eklemek için mevcut görsellerden birini silin.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              paddingVertical: spacing.xl,
              alignItems: 'center',
              backgroundColor: '#311831',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Icon name="image-multiple-outline" size={40} color={colors.textTertiary} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Henüz fotoğraf yok
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: tileSize }}>
            <View
              style={{
                width: tileSize,
                height: tileSize,
                borderRadius: radius.md,
                overflow: 'hidden',
                backgroundColor: '#311831',
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Image source={{ uri: item.publicUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: `${colors.background}CC` }]}
                onPress={() => setDeleteTarget(item)}
                disabled={removingId === item.id}
                hitSlop={8}
              >
                {removingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="close" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Fotoğrafı sil"
        message="Bu görsel kalıcı olarak kaldırılır."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
