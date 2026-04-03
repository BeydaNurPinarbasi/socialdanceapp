import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import {
  instructorStudentsService,
  InstructorFollowerSearchHit,
} from '../../services/api/instructorStudents';

const STATUS_LABEL: Record<string, string> = {
  invited: 'Davetli',
  active: 'Aktif',
  archived: 'Arşiv',
};

export const InstructorStudentsTab: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const [items, setItems] = useState<Awaited<ReturnType<typeof instructorStudentsService.listMine>>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstructorFollowerSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const rosterIds = useMemo(() => new Set(items.map((i) => i.studentUserId)), [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorStudentsService.listMine();
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

  const onSearchFollowers = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setErrorBanner('Aramak için en az 2 karakter yazın (ör. ad, soyad veya e-posta parçası).');
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setErrorBanner(null);
    try {
      const hits = await instructorStudentsService.searchMyFollowers(q);
      setSearchResults(hits);
    } catch (e: unknown) {
      setSearchResults([]);
      setErrorBanner(e instanceof Error ? e.message : 'Arama yapılamadı.');
    } finally {
      setSearching(false);
    }
  };

  const onAddHit = async (studentUserId: string) => {
    setAddingId(studentUserId);
    setErrorBanner(null);
    try {
      await instructorStudentsService.addStudent(studentUserId);
      setSearchResults((prev) => prev.filter((h) => h.studentUserId !== studentUserId));
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eklenemedi.';
      setErrorBanner(msg.includes('duplicate') || msg.includes('23505') ? 'Bu öğrenci zaten listede.' : msg);
    } finally {
      setAddingId(null);
    }
  };

  const displayNameForHit = (h: InstructorFollowerSearchHit) => {
    const d = h.displayName.trim();
    if (d) return d;
    if (h.username) return `@${h.username}`;
    return h.email || 'Kullanıcı';
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {errorBanner ? (
        <Text style={[typography.caption, { color: colors.orange, marginBottom: spacing.sm }]}>{errorBanner}</Text>
      ) : null}

      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        Ekleyeceğiniz öğrenci
      </Text>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Adını, soyadını veya uygulamadaki e-posta adresini yazın"
            accessibilityLabel="Öğrenci arama: takipçileriniz arasında ad, soyad veya e-posta ile arayın"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            onSubmitEditing={() => void onSearchFollowers()}
            containerStyle={styles.searchInputContainer}
          />
        </View>
        <Button
          title="Ara"
          onPress={() => void onSearchFollowers()}
          loading={searching}
          size="md"
          style={styles.searchButton}
        />
      </View>

      {searchResults.length > 0 ? (
        <>
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            Sonuçlar ({searchResults.length})
          </Text>
          {searchResults.map((hit) => {
            const onRoster = rosterIds.has(hit.studentUserId);
            const busy = addingId === hit.studentUserId;
            return (
              <View
                key={hit.studentUserId}
                style={[
                  styles.card,
                  {
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: '#311831',
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.hitRow}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{displayNameForHit(hit)}</Text>
                    {hit.username ? (
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>@{hit.username}</Text>
                    ) : null}
                    {hit.email ? (
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{hit.email}</Text>
                    ) : null}
                  </View>
                  {onRoster ? (
                    <Text style={[typography.captionBold, { color: colors.textTertiary }]}>Listede</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => void onAddHit(hit.studentUserId)}
                      disabled={busy}
                      style={[
                        styles.addPill,
                        {
                          backgroundColor: `${colors.primary}33`,
                          borderColor: colors.primary,
                          opacity: busy ? 0.6 : 1,
                        },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Text style={[typography.captionBold, { color: colors.primary }]}>Ekle</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Öğrenciler ({items.length})
      </Text>
      {items.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz öğrenci yok.</Text>
      ) : (
        items.map((row) => (
          <View
            key={row.id}
            style={[
              styles.card,
              {
                marginTop: spacing.sm,
                padding: spacing.md,
                backgroundColor: '#311831',
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: '#4B154B', overflow: 'hidden' }]}>
                {row.avatarUrl ? (
                  <Image source={{ uri: row.avatarUrl }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Icon name="account" size={20} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{row.displayName}</Text>
                {row.username ? (
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>@{row.username}</Text>
                ) : null}
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  searchButton: {
    flexShrink: 0,
  },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  hitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
