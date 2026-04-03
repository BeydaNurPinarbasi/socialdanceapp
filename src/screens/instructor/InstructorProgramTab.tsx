import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import {
  instructorLessonsService,
  instructorScheduleService,
  InstructorLessonModel,
  InstructorScheduleSlotModel,
} from '../../services/api/instructorLessons';
import {
  INSTRUCTOR_LOCATION_CHIPS,
  INSTRUCTOR_WEEKDAYS,
  instructorLocationLabel,
  instructorWeekdayLabel,
} from './instructorScheduleConstants';

export const InstructorProgramTab: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const [lessons, setLessons] = useState<InstructorLessonModel[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [slots, setSlots] = useState<InstructorScheduleSlotModel[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('19:00');
  const [locationType, setLocationType] = useState<InstructorScheduleSlotModel['locationType']>('in_person');
  const [address, setAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deleteSlot, setDeleteSlot] = useState<InstructorScheduleSlotModel | null>(null);

  const loadLessons = useCallback(async () => {
    setLoadingLessons(true);
    setErrorBanner(null);
    try {
      const list = await instructorLessonsService.listMine();
      setLessons(list);
      setSelectedLessonId((prev) => {
        if (prev && list.some((l) => l.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e: unknown) {
      setLessons([]);
      setSelectedLessonId(null);
      setErrorBanner(e instanceof Error ? e.message : 'Dersler yüklenemedi.');
    } finally {
      setLoadingLessons(false);
    }
  }, []);

  const loadSlots = useCallback(async (lessonId: string | null) => {
    if (!lessonId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const list = await instructorScheduleService.listByLesson(lessonId);
      setSlots(list);
    } catch {
      setSlots([]);
      setErrorBanner('Program satırları yüklenemedi.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLessons();
    }, [loadLessons]),
  );

  useEffect(() => {
    void loadSlots(selectedLessonId);
  }, [selectedLessonId, loadSlots]);

  const onAddSlot = async () => {
    if (!selectedLessonId) return;
    setAdding(true);
    setErrorBanner(null);
    try {
      await instructorScheduleService.createSlot({
        lessonId: selectedLessonId,
        weekday,
        startTime,
        locationType,
        address: address.trim() || null,
      });
      setAddress('');
      await loadSlots(selectedLessonId);
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Eklenemedi.');
    } finally {
      setAdding(false);
    }
  };

  const onConfirmDeleteSlot = async () => {
    if (!deleteSlot || !selectedLessonId) return;
    const id = deleteSlot.id;
    try {
      await instructorScheduleService.removeSlot(id);
      setDeleteSlot(null);
      await loadSlots(selectedLessonId);
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Silinemedi.');
      setDeleteSlot(null);
    }
  };

  if (loadingLessons && lessons.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (lessons.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.lg }]}>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
          Program eklemek için önce Dersler sekmesinden en az bir ders oluşturun.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {errorBanner ? (
        <Text style={[typography.caption, { color: colors.orange, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          {errorBanner}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Ders seçin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {lessons.map((l) => {
            const selected = l.id === selectedLessonId;
            return (
              <TouchableOpacity
                key={l.id}
                onPress={() => setSelectedLessonId(l.id)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.cardBorder,
                  backgroundColor: selected ? `${colors.primary}22` : '#311831',
                }}
              >
                <Text style={[typography.captionBold, { color: selected ? colors.primary : '#FFFFFF' }]} numberOfLines={1}>
                  {l.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Haftalık tekrarlayan saat (örn. her Pazartesi 19:00). Tarih bazlı oturumlar ileride eklenecek.
        </Text>

        <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>Gün</Text>
        <View style={styles.chipRow}>
          {INSTRUCTOR_WEEKDAYS.map((d) => (
            <View key={d.v} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
              <Chip label={d.label} selected={weekday === d.v} onPress={() => setWeekday(d.v)} />
            </View>
          ))}
        </View>

        <Input label="Saat" value={startTime} onChangeText={setStartTime} placeholder="19:00" />

        <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Konum tipi
        </Text>
        <View style={styles.chipRow}>
          {INSTRUCTOR_LOCATION_CHIPS.map((loc) => (
            <View key={loc.id} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
              <Chip label={loc.label} selected={locationType === loc.id} onPress={() => setLocationType(loc.id)} />
            </View>
          ))}
        </View>

        {(locationType === 'in_person' || locationType === 'school') && (
          <Input
            label="Adres / not"
            value={address}
            onChangeText={setAddress}
            placeholder="İsteğe bağlı"
            multiline
          />
        )}

        <View style={{ marginTop: spacing.md }}>
          <Button title="Program satırı ekle" onPress={() => void onAddSlot()} loading={adding} fullWidth />
        </View>

        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          Bu derse ait satırlar
        </Text>
        {loadingSlots ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : slots.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz satır yok.</Text>
        ) : (
          slots.map((s) => {
            const dayLabel = instructorWeekdayLabel(s.weekday);
            const locLabel = instructorLocationLabel(s.locationType);
            return (
              <View
                key={s.id}
                style={[
                  styles.slotRow,
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
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                    {dayLabel} {s.startTime}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                    {locLabel}
                    {s.address ? ` · ${s.address}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDeleteSlot(s)} hitSlop={12}>
                  <Icon name="trash-can-outline" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!deleteSlot}
        title="Satırı sil"
        message="Bu program satırını silmek istiyor musunuz?"
        cancelLabel="Vazgeç"
        confirmLabel="Sil"
        onCancel={() => setDeleteSlot(null)}
        onConfirm={() => void onConfirmDeleteSlot()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
});
