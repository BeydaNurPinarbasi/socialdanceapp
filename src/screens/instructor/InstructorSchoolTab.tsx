import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { instructorSchoolAssignmentsService } from '../../services/api/instructorSchoolAssignments';
import { instructorSchoolEventsService } from '../../services/api/schoolEvents';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const InstructorSchoolTab: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography, radius } = useTheme();
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof instructorSchoolAssignmentsService.listMine>>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof instructorSchoolEventsService.listMine>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolList, eventList] = await Promise.all([
        instructorSchoolAssignmentsService.listMine(),
        instructorSchoolEventsService.listMine().catch(() => []),
      ]);
      setSchools(schoolList);
      setEvents(eventList);
      setSelectedSchoolId((prev) => {
        if (prev && schoolList.some((school) => school.schoolId === prev)) return prev;
        return schoolList[0]?.schoolId ?? null;
      });
    } catch {
      setSchools([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const eventGroups = useMemo(() => {
    const grouped = new Map<string, typeof events>();
    events.forEach((event) => {
      const current = grouped.get(event.school_id) ?? [];
      current.push(event);
      grouped.set(event.school_id, current);
    });
    return grouped;
  }, [events]);

  const formatEventDateLabel = useCallback((startsAt: string) => {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return 'Tarih bilgisi okunamadı';
    return date.toLocaleString('tr-TR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const buildStartsAtIso = useCallback(() => {
    const normalizedDate = eventDate.trim();
    const normalizedTime = eventTime.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return null;
    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) return null;

    const candidate = new Date(`${normalizedDate}T${normalizedTime}:00`);
    if (Number.isNaN(candidate.getTime())) return null;
    return candidate.toISOString();
  }, [eventDate, eventTime]);

  const onCreateEvent = async () => {
    const nextErrors: Record<string, string> = {};
    if (!selectedSchoolId) nextErrors.school = 'Etkinlik için okul seçin.';
    if (!eventTitle.trim()) nextErrors.title = 'Etkinlik adı zorunludur.';
    if (!eventDate.trim()) nextErrors.date = 'Tarih zorunludur.';
    if (!eventTime.trim()) nextErrors.time = 'Saat zorunludur.';

    const startsAt = buildStartsAtIso();
    if (eventDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      nextErrors.date = 'Tarihi YYYY-AA-GG biçiminde girin.';
    }
    if (eventTime.trim() && !/^\d{2}:\d{2}$/.test(eventTime.trim())) {
      nextErrors.time = 'Saati SS:DD biçiminde girin.';
    }
    if (eventDate.trim() && eventTime.trim() && !startsAt) {
      nextErrors.time = 'Geçerli bir tarih ve saat girin.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !startsAt || !selectedSchoolId) {
      return;
    }

    setSaving(true);
    try {
      await instructorSchoolEventsService.create({
        schoolId: selectedSchoolId,
        title: eventTitle,
        startsAt,
        location,
        description,
      });
      setEventTitle('');
      setEventDate('');
      setEventTime('');
      setLocation('');
      setDescription('');
      setErrors({});
      await load();
      setAlertModal({
        title: 'Etkinlik oluşturuldu',
        message: 'Etkinlik başarıyla kaydedildi ve okul detaylarında görünmeye hazır.',
      });
    } catch (error: unknown) {
      setAlertModal({
        title: 'Etkinlik oluşturulamadı',
        message: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (schools.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.lg }]}>
        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.xl,
            alignItems: 'center',
          }}
        >
          <Icon name="school-outline" size={40} color={colors.textTertiary} />
          <Text style={[typography.bodyBold, { color: '#FFFFFF', marginTop: spacing.md, textAlign: 'center' }]}>
            Yetkilendirildiğiniz bir okul bulunmamaktadır
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Okul ataması yönetici tarafından yapılır. Atama sonrası okul bilgileri burada görünür.
          </Text>
        </View>
      </View>
    );
  }

  const locationLine = (s: (typeof schools)[0]) => {
    const parts = [s.district, s.city].filter(Boolean).join(', ');
    return parts || s.address || '';
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ConfirmModal
        visible={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAlertModal(null)}
        onConfirm={() => setAlertModal(null)}
      />

      <Text style={[typography.captionBold, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Atanan okullar</Text>
      <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
        Aşağıdaki okul(lar) yönetici tarafından hesabınıza bağlanmıştır.
      </Text>

      <View
        style={[
          styles.formCard,
          {
            marginBottom: spacing.lg,
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.lg,
          },
        ]}
      >
        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Etkinlik oluştur</Text>
        <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Yetkili olduğunuz okullardan biri adına yeni bir etkinlik yayınlayın.
        </Text>

        <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Okul seçin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
          {schools.map((school) => {
            const selected = selectedSchoolId === school.schoolId;
            return (
              <TouchableOpacity
                key={school.schoolId}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedSchoolId(school.schoolId);
                  setErrors((prev) => ({ ...prev, school: '' }));
                }}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.cardBorder,
                  backgroundColor: selected ? `${colors.primary}22` : '#4B154B',
                }}
              >
                <Text style={[typography.captionBold, { color: selected ? colors.primary : '#FFFFFF' }]} numberOfLines={1}>
                  {school.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {errors.school ? (
          <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
            {errors.school}
          </Text>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Input
          label="Etkinlik adı"
          value={eventTitle}
          onChangeText={(value) => {
            setEventTitle(value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
          }}
          placeholder="Örn. Bachata sosyal gecesi"
          error={errors.title}
        />
        <View style={{ height: spacing.md }} />
        <Input
          label="Tarih"
          value={eventDate}
          onChangeText={(value) => {
            setEventDate(value);
            if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
          }}
          placeholder="YYYY-AA-GG"
          autoCapitalize="none"
          error={errors.date}
        />
        <View style={{ height: spacing.md }} />
        <Input
          label="Saat"
          value={eventTime}
          onChangeText={(value) => {
            setEventTime(value);
            if (errors.time) setErrors((prev) => ({ ...prev, time: '' }));
          }}
          placeholder="19:30"
          autoCapitalize="none"
          error={errors.time}
        />
        <View style={{ height: spacing.md }} />
        <Input
          label="Konum"
          value={location}
          onChangeText={setLocation}
          placeholder="Salon adı veya adres"
        />
        <View style={{ height: spacing.md }} />
        <Input
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Etkinlik detayları, seviye, dress code, notlar..."
          multiline
        />
        <View style={{ marginTop: spacing.md }}>
          <Button title="Etkinliği oluştur" onPress={() => void onCreateEvent()} loading={saving} fullWidth />
        </View>
      </View>

      {schools.map((s) => (
        <View
          key={s.schoolId}
          style={[
            styles.groupCard,
            {
              marginBottom: spacing.md,
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SchoolDetails', { id: s.schoolId })}
          >
            <View style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: '#4B154B', overflow: 'hidden' }]}>
                {s.imageUrl ? (
                  <Image source={{ uri: s.imageUrl }} style={{ width: 56, height: 56 }} />
                ) : (
                  <Icon name="school" size={28} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {s.name}
                </Text>
                {locationLine(s) ? (
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]} numberOfLines={2}>
                    {locationLine(s)}
                  </Text>
                ) : null}
                {s.telephone ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{s.telephone}</Text>
                ) : null}
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder }}>
            <Text style={[typography.captionBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Yayınlanan etkinlikler</Text>
            {(eventGroups.get(s.schoolId) ?? []).length > 0 ? (
              (eventGroups.get(s.schoolId) ?? []).map((event) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('EventDetails', { id: event.id })}
                  style={{ paddingVertical: spacing.sm }}
                >
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{event.title}</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                    {formatEventDateLabel(event.starts_at)}
                  </Text>
                  {event.location?.trim() ? (
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                      {event.location.trim()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Bu okul için henüz etkinlik oluşturulmadı.
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
  formCard: {},
  groupCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
