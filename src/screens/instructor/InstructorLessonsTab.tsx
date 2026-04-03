import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { LessonDateTimeField } from '../../components/instructor/LessonDateTimeField';
import {
  formatLessonPrice,
  formatLessonStartsAt,
  instructorLessonsService,
  instructorScheduleService,
  InstructorLessonModel,
  InstructorScheduleSlotModel,
  lessonStartsAtToDate,
  parseLessonStartsAtToIso,
  parseTlToCents,
} from '../../services/api/instructorLessons';
import {
  INSTRUCTOR_LOCATION_CHIPS,
  INSTRUCTOR_WEEKDAYS,
  instructorLocationLabel,
  instructorWeekdayLabel,
} from './instructorScheduleConstants';

const LEVELS = ['Tüm Seviyeler', 'Başlangıç', 'Orta', 'İleri'] as const;

type PendingScheduleSlot = {
  localId: string;
  weekday: number;
  startTime: string;
  locationType: InstructorScheduleSlotModel['locationType'];
  address: string | null;
};

export const InstructorLessonsTab: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const [lessons, setLessons] = useState<InstructorLessonModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstructorLessonModel | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [priceText, setPriceText] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructorLessonModel | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lessonStartsAt, setLessonStartsAt] = useState<Date | null>(null);
  const [programWeekday, setProgramWeekday] = useState(0);
  const [programStartTime, setProgramStartTime] = useState('19:00');
  const [programLocationType, setProgramLocationType] =
    useState<InstructorScheduleSlotModel['locationType']>('in_person');
  const [programAddress, setProgramAddress] = useState('');
  const [pendingSlots, setPendingSlots] = useState<PendingScheduleSlot[]>([]);
  const [modalSlots, setModalSlots] = useState<InstructorScheduleSlotModel[]>([]);
  const [loadingModalSlots, setLoadingModalSlots] = useState(false);
  const [programAdding, setProgramAdding] = useState(false);
  const [slotDeleteTarget, setSlotDeleteTarget] = useState<InstructorScheduleSlotModel | null>(null);
  const [detailLesson, setDetailLesson] = useState<InstructorLessonModel | null>(null);
  const [detailSlots, setDetailSlots] = useState<InstructorScheduleSlotModel[]>([]);
  const [loadingDetailSlots, setLoadingDetailSlots] = useState(false);
  const [detailLoadError, setDetailLoadError] = useState<string | null>(null);

  const resetProgramForm = useCallback(() => {
    setProgramWeekday(0);
    setProgramStartTime('19:00');
    setProgramLocationType('in_person');
    setProgramAddress('');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorLessonsService.listMine();
      setLessons(list);
    } catch (e: unknown) {
      setLessons([]);
      setErrorBanner(e instanceof Error ? e.message : 'Dersler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!modalOpen || !editing) {
      setModalSlots([]);
      setLoadingModalSlots(false);
      return;
    }
    let cancelled = false;
    setLoadingModalSlots(true);
    void instructorScheduleService
      .listByLesson(editing.id)
      .then((list) => {
        if (!cancelled) setModalSlots(list);
      })
      .catch(() => {
        if (!cancelled) setModalSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingModalSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, editing?.id]);

  useEffect(() => {
    if (!detailLesson) {
      setDetailSlots([]);
      setLoadingDetailSlots(false);
      setDetailLoadError(null);
      return;
    }
    let cancelled = false;
    setDetailLoadError(null);
    setLoadingDetailSlots(true);
    void instructorScheduleService
      .listByLesson(detailLesson.id)
      .then((list) => {
        if (!cancelled) setDetailSlots(list);
      })
      .catch(() => {
        if (!cancelled) {
          setDetailSlots([]);
          setDetailLoadError('Program yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailLesson?.id]);

  const openDetail = (lesson: InstructorLessonModel) => {
    setDetailLesson(lesson);
  };

  const closeDetail = () => {
    setDetailLesson(null);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setLevel(LEVELS[0]);
    setPriceText('');
    setIsPublished(true);
    setLessonStartsAt(null);
    setPendingSlots([]);
    resetProgramForm();
    setSlotDeleteTarget(null);
    setErrorBanner(null);
    setModalOpen(true);
  };

  const openEdit = (lesson: InstructorLessonModel) => {
    setEditing(lesson);
    setTitle(lesson.title);
    setDescription(lesson.description);
    setLevel(lesson.level || LEVELS[0]);
    setPriceText(
      lesson.priceCents != null && lesson.priceCents > 0 ? String(lesson.priceCents / 100) : '',
    );
    setIsPublished(lesson.isPublished);
    setLessonStartsAt(lessonStartsAtToDate(lesson.startsAt));
    setPendingSlots([]);
    resetProgramForm();
    setSlotDeleteTarget(null);
    setErrorBanner(null);
    setModalOpen(true);
  };

  const openEditFromDetail = () => {
    if (!detailLesson) return;
    const l = detailLesson;
    setDetailLesson(null);
    openEdit(l);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingSlots([]);
    setSlotDeleteTarget(null);
  };

  const onAddProgramRow = async () => {
    if (editing) {
      setProgramAdding(true);
      setErrorBanner(null);
      try {
        await instructorScheduleService.createSlot({
          lessonId: editing.id,
          weekday: programWeekday,
          startTime: programStartTime,
          locationType: programLocationType,
          address: programAddress.trim() || null,
        });
        setProgramAddress('');
        const list = await instructorScheduleService.listByLesson(editing.id);
        setModalSlots(list);
      } catch (e: unknown) {
        setErrorBanner(e instanceof Error ? e.message : 'Program satırı eklenemedi.');
      } finally {
        setProgramAdding(false);
      }
      return;
    }
    setPendingSlots((prev) => [
      ...prev,
      {
        localId: `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        weekday: programWeekday,
        startTime: programStartTime,
        locationType: programLocationType,
        address: programAddress.trim() || null,
      },
    ]);
    setProgramAddress('');
  };

  const removePendingSlot = (localId: string) => {
    setPendingSlots((prev) => prev.filter((p) => p.localId !== localId));
  };

  const onConfirmDeleteModalSlot = async () => {
    if (!slotDeleteTarget || !editing) return;
    const id = slotDeleteTarget.id;
    try {
      await instructorScheduleService.removeSlot(id);
      setSlotDeleteTarget(null);
      const list = await instructorScheduleService.listByLesson(editing.id);
      setModalSlots(list);
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Satır silinemedi.');
      setSlotDeleteTarget(null);
    }
  };

  const onSaveLesson = async () => {
    if (!title.trim()) {
      setErrorBanner('Ders adı gerekli.');
      return;
    }
    const cents = parseTlToCents(priceText);
    setSaving(true);
    setErrorBanner(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priceCents: cents,
        level,
        isPublished,
        startsAt: parseLessonStartsAtToIso(lessonStartsAt),
      };
      if (editing) {
        await instructorLessonsService.update(editing.id, payload);
      } else {
        const created = await instructorLessonsService.create(payload);
        try {
          for (const p of pendingSlots) {
            await instructorScheduleService.createSlot({
              lessonId: created.id,
              weekday: p.weekday,
              startTime: p.startTime,
              locationType: p.locationType,
              address: p.address,
            });
          }
        } catch (slotErr: unknown) {
          setErrorBanner(
            slotErr instanceof Error
              ? slotErr.message
              : 'Ders kaydedildi; bazı program satırları eklenemedi. Program sekmesinden ekleyebilirsiniz.',
          );
          closeModal();
          await load();
          return;
        }
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await instructorLessonsService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Silinemedi.');
      setDeleteTarget(null);
    }
  };

  if (loading && lessons.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {errorBanner && !modalOpen && !detailLesson ? (
        <Text style={[typography.caption, { color: colors.orange, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          {errorBanner}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Button title="Yeni ders" onPress={openCreate} fullWidth icon="plus" />
        {lessons.length === 0 ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }]}>
            Henüz ders eklemediniz. Ücret alanını boş bırakırsanız ders ücretsiz görünür.
          </Text>
        ) : null}
        {lessons.map((lesson) => (
          <View
            key={lesson.id}
            style={[
              styles.card,
              {
                marginTop: spacing.md,
                backgroundColor: '#311831',
                borderColor: colors.cardBorder,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <TouchableOpacity
                style={{ flex: 1, paddingRight: spacing.sm }}
                activeOpacity={0.75}
                onPress={() => openEdit(lesson)}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title} dersini düzenle`}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {lesson.title}
                </Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  {lesson.level} · {formatLessonPrice(lesson)}
                  {!lesson.isPublished ? ' · Yayında değil' : ''}
                </Text>
                {formatLessonStartsAt(lesson.startsAt) ? (
                  <Text style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>
                    {formatLessonStartsAt(lesson.startsAt)}
                  </Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => openDetail(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Detayı görüntüle"
                >
                  <Icon name="eye-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEdit(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Düzenle"
                >
                  <Icon name="pencil-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Sil"
                >
                  <Icon name="trash-can-outline" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
            {lesson.description ? (
              <TouchableOpacity activeOpacity={0.75} onPress={() => openEdit(lesson)}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]} numberOfLines={3}>
                  {lesson.description}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <View style={[styles.modalBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderRadius: radius.xl }]}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>
              {editing ? 'Dersi düzenle' : 'Yeni ders'}
            </Text>
            {errorBanner && modalOpen ? (
              <Text style={[typography.caption, { color: colors.orange, marginBottom: spacing.sm }]}>{errorBanner}</Text>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Ders adı" value={title} onChangeText={setTitle} placeholder="Örn. Bachata partnerwork" />
              <View style={{ height: spacing.md }} />
              <LessonDateTimeField value={lessonStartsAt} onChange={setLessonStartsAt} />
              <Input
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                placeholder="İsteğe bağlı"
                multiline
              />
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Seviye
              </Text>
              <View style={styles.chipRow}>
                {LEVELS.map((lv) => (
                  <View key={lv} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={lv} selected={level === lv} onPress={() => setLevel(lv)} />
                  </View>
                ))}
              </View>
              <Input
                label="Ücret (TL)"
                value={priceText}
                onChangeText={setPriceText}
                placeholder="Boş = ücretsiz"
                keyboardType="decimal-pad"
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.lg,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  backgroundColor: '#311831',
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Yayında</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                    Kapalıysa yalnızca siz görürsünüz.
                  </Text>
                </View>
                <Toggle value={isPublished} onValueChange={setIsPublished} />
              </View>

              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.xs }]}>
                Haftalık program
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {editing
                  ? 'Bu derse tekrarlayan gün ve saat ekleyin; kayıt anında sunucuya yazılır.'
                  : 'Kaydetmeden önce listeye ekleyin; ders oluşturulunca birlikte kaydedilir.'}
              </Text>

              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Gün</Text>
              <View style={styles.chipRow}>
                {INSTRUCTOR_WEEKDAYS.map((d) => (
                  <View key={d.v} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={d.label} selected={programWeekday === d.v} onPress={() => setProgramWeekday(d.v)} />
                  </View>
                ))}
              </View>

              <Input label="Saat" value={programStartTime} onChangeText={setProgramStartTime} placeholder="19:00" />

              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Konum tipi
              </Text>
              <View style={styles.chipRow}>
                {INSTRUCTOR_LOCATION_CHIPS.map((loc) => (
                  <View key={loc.id} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip
                      label={loc.label}
                      selected={programLocationType === loc.id}
                      onPress={() => setProgramLocationType(loc.id)}
                    />
                  </View>
                ))}
              </View>

              {(programLocationType === 'in_person' || programLocationType === 'school') && (
                <Input
                  label="Adres / not"
                  value={programAddress}
                  onChangeText={setProgramAddress}
                  placeholder="İsteğe bağlı"
                  multiline
                />
              )}

              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Program satırı ekle"
                  onPress={() => void onAddProgramRow()}
                  loading={programAdding}
                  fullWidth
                />
              </View>

              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                {editing ? 'Bu derse ait satırlar' : 'Eklenecek satırlar'}
              </Text>
              {editing && loadingModalSlots ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
              ) : editing && modalSlots.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz program satırı yok.</Text>
              ) : editing ? (
                modalSlots.map((s) => (
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
                        {instructorWeekdayLabel(s.weekday)} {s.startTime}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                        {instructorLocationLabel(s.locationType)}
                        {s.address ? ` · ${s.address}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSlotDeleteTarget(s)} hitSlop={12}>
                      <Icon name="trash-can-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : pendingSlots.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz satır eklemediniz.</Text>
              ) : (
                pendingSlots.map((p) => (
                  <View
                    key={p.localId}
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
                        {instructorWeekdayLabel(p.weekday)} {p.startTime}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                        {instructorLocationLabel(p.locationType)}
                        {p.address ? ` · ${p.address}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removePendingSlot(p.localId)} hitSlop={12}>
                      <Icon name="trash-can-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
                <Button
                  title="İptal"
                  onPress={closeModal}
                  variant="outline"
                  style={{ flex: 1, borderColor: 'rgba(255,255,255,0.35)' }}
                  textStyle={{ color: '#FFFFFF' }}
                />
                <Button
                  title={editing ? 'Güncelle' : 'Kaydet'}
                  onPress={() => void onSaveLesson()}
                  loading={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!detailLesson} animationType="slide" transparent onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDetail} />
          <View style={[styles.modalBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderRadius: radius.xl }]}>
            {detailLesson ? (
              <>
                <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>Ders detayı</Text>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{detailLesson.title}</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>
                    {detailLesson.level} · {formatLessonPrice(detailLesson)}
                    {!detailLesson.isPublished ? ' · Yayında değil' : ''}
                  </Text>
                  {formatLessonStartsAt(detailLesson.startsAt) ? (
                    <Text style={[typography.caption, { color: colors.primary, marginTop: 6 }]}>
                      {formatLessonStartsAt(detailLesson.startsAt)}
                    </Text>
                  ) : null}

                  <Text style={[typography.label, { color: colors.textTertiary, marginTop: spacing.lg }]}>Açıklama</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {detailLesson.description?.trim() ? detailLesson.description : 'Açıklama eklenmemiş.'}
                  </Text>

                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    Haftalık program
                  </Text>
                  {detailLoadError ? (
                    <Text style={[typography.caption, { color: colors.orange }]}>{detailLoadError}</Text>
                  ) : loadingDetailSlots ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
                  ) : detailSlots.length === 0 ? (
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz program satırı yok.</Text>
                  ) : (
                    detailSlots.map((s) => (
                      <View
                        key={s.id}
                        style={{
                          marginTop: spacing.sm,
                          padding: spacing.md,
                          backgroundColor: '#311831',
                          borderRadius: radius.lg,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                        }}
                      >
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                          {instructorWeekdayLabel(s.weekday)} {s.startTime}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                          {instructorLocationLabel(s.locationType)}
                          {s.address ? ` · ${s.address}` : ''}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                    <Button
                      title="Kapat"
                      onPress={closeDetail}
                      variant="outline"
                      style={{ flex: 1, borderColor: 'rgba(255,255,255,0.35)' }}
                      textStyle={{ color: '#FFFFFF' }}
                    />
                    <Button title="Düzenle" onPress={openEditFromDetail} style={{ flex: 1 }} />
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Dersi sil"
        message="Bu ders ve bağlı program satırları silinecek. Emin misiniz?"
        cancelLabel="Vazgeç"
        confirmLabel="Sil"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmModal
        visible={!!slotDeleteTarget}
        title="Program satırını sil"
        message="Bu haftalık satırı silmek istiyor musunuz?"
        cancelLabel="Vazgeç"
        confirmLabel="Sil"
        onCancel={() => setSlotDeleteTarget(null)}
        onConfirm={() => void onConfirmDeleteModalSlot()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardActions: { flexDirection: 'row', alignItems: 'flex-start' },
  cardActionBtn: { padding: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalBox: {
    maxHeight: '88%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
