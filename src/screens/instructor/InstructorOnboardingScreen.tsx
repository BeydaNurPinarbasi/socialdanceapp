import React, { useCallback, useState } from 'react';
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
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Toggle } from '../../components/ui/Toggle';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Icon } from '../../components/ui/Icon';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import {
  instructorProfileService,
  InstructorProfileModel,
  InstructorWorkMode,
} from '../../services/api/instructorProfile';
import { InstructorLessonsTab } from './InstructorLessonsTab';
import { InstructorStudentsTab } from './InstructorStudentsTab';
import { InstructorSchoolTab } from './InstructorSchoolTab';
import { InstructorCalendarTab } from './InstructorCalendarTab';
import { InstructorMediaTab } from './InstructorMediaTab';

const SPECIALTIES = ['Salsa', 'Bachata', 'Tango', 'Kizomba', 'Swing', 'Zumba', 'Vals', 'Modern', 'Hip-Hop', 'Diğer'] as const;

const WORK_OPTIONS: { mode: InstructorWorkMode; label: string; hint: string }[] = [
  { mode: 'individual', label: 'Bireysel', hint: 'Kendi adıma ders veriyorum' },
  { mode: 'school', label: 'Okul / kurum', hint: 'Bir okula veya kuruma bağlıyım' },
  { mode: 'both', label: 'Her ikisi', hint: 'Hem bireysel hem kurumla çalışıyorum' },
];

type InstructorTabId = 'profile' | 'lessons' | 'calendar' | 'media' | 'students' | 'school';

const INSTRUCTOR_TABS: { id: InstructorTabId; label: string }[] = [
  { id: 'profile', label: 'Profil' },
  { id: 'lessons', label: 'Dersler' },
  { id: 'calendar', label: 'Takvim' },
  { id: 'media', label: 'Medya' },
  { id: 'students', label: 'Öğrenciler' },
  { id: 'school', label: 'Okul' },
];

function LockedTabBody(props: {
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  radius: ReturnType<typeof useTheme>['radius'];
  onGoProfile: () => void;
}) {
  const { colors, spacing, typography, radius, onGoProfile } = props;
  return (
    <View style={[styles.tabBodyCenter, { padding: spacing.lg }]}>
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
        <Icon name="lock-outline" size={40} color={colors.textTertiary} />
        <Text style={[typography.bodyBold, { color: '#FFFFFF', marginTop: spacing.md, textAlign: 'center' }]}>
          Önce eğitmen profili oluşturun
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
          Bu bölüme geçmek için Profil sekmesinde bilgilerinizi kaydedin.
        </Text>
        <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <Button title="Profil sekmesine git" onPress={onGoProfile} fullWidth />
        </View>
      </View>
    </View>
  );
}

export const InstructorOnboardingScreen: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const [activeTab, setActiveTab] = useState<InstructorTabId>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<InstructorProfileModel | null>(null);
  const [workMode, setWorkMode] = useState<InstructorWorkMode>('individual');
  const [headline, setHeadline] = useState('');
  const [instructorBio, setInstructorBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setExisting(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await instructorProfileService.getMine();
      setExisting(row);
      if (row) {
        setWorkMode(row.workMode);
        setHeadline(row.headline);
        setInstructorBio(row.instructorBio);
        setSpecialties(row.specialties);
        setIsVisible(row.isVisible);
      }
    } catch {
      setAlertModal({
        title: 'Yüklenemedi',
        message: 'Eğitmen profili alınamadı. Bağlantınızı kontrol edip tekrar deneyin.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleSpecialty = (d: string) => {
    setSpecialties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const onSave = async () => {
    if (!hasSupabaseConfig()) {
      setAlertModal({
        title: 'Yapılandırma eksik',
        message: 'Supabase ortam değişkenleri tanımlı değil. Profil kaydedilemiyor.',
      });
      return;
    }
    if (!headline.trim()) {
      setAlertModal({ title: 'Eksik bilgi', message: 'Kısa bir başlık (ör. uzmanlık veya rol) girin.' });
      return;
    }
    setSaving(true);
    try {
      const wasNew = !existing;
      const updated = await instructorProfileService.upsertMine({
        workMode,
        headline,
        instructorBio,
        specialties,
        isVisible,
      });
      setExisting(updated);
      setAlertModal({
        title: 'Kaydedildi',
        message: wasNew
          ? 'Eğitmen profiliniz oluşturuldu. Diğer sekmelerden ders ve takvim üzerinden devam edebilirsiniz.'
          : 'Eğitmen profiliniz güncellendi.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kayıt sırasında bir hata oluştu.';
      setAlertModal({ title: 'Hata', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const hasProfile = !!existing;
  const headerTitle = hasProfile ? 'Eğitmen paneli' : 'Eğitmen ol';

  const renderTabContent = () => {
    if (activeTab === 'profile') {
      return (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Keşfette görünecek bilgiler ve çalışma şekliniz. Kaydettikten sonra diğer sekmeleri kullanabilirsiniz.
          </Text>

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Çalışma şekli</Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {WORK_OPTIONS.map((opt) => {
              const selected = workMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  activeOpacity={0.8}
                  onPress={() => setWorkMode(opt.mode)}
                  style={{
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.cardBorder,
                    backgroundColor: selected ? `${colors.primary}18` : '#311831',
                  }}
                >
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>{opt.label}</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>{opt.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input label="Kısa başlık" value={headline} onChangeText={setHeadline} placeholder="Örn. Bachata & salsa eğitmeni" />
          <View style={{ height: spacing.md }} />
          <Input
            label="Eğitmen hakkında"
            value={instructorBio}
            onChangeText={setInstructorBio}
            placeholder="Deneyim, stil, dille ilgili notlar..."
            multiline
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>Branşlar</Text>
          <View style={styles.chipWrap}>
            {SPECIALTIES.map((d) => (
              <View key={d} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                <Chip label={d} selected={specialties.includes(d)} onPress={() => toggleSpecialty(d)} />
              </View>
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              backgroundColor: '#311831',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Keşfette görünür</Text>
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                Diğer kullanıcılar eğitmen profilinizi Keşfet’te görebilir.
              </Text>
            </View>
            <Toggle value={isVisible} onValueChange={setIsVisible} />
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <Button title={existing ? 'Profili kaydet' : 'Profili oluştur'} onPress={() => void onSave()} loading={saving} fullWidth />
          </View>
        </ScrollView>
      );
    }

    if (!hasProfile) {
      return (
        <LockedTabBody
          colors={colors}
          spacing={spacing}
          typography={typography}
          radius={radius}
          onGoProfile={() => setActiveTab('profile')}
        />
      );
    }

    if (activeTab === 'lessons') {
      return <InstructorLessonsTab />;
    }
    if (activeTab === 'calendar') {
      return <InstructorCalendarTab />;
    }
    if (activeTab === 'media') {
      return <InstructorMediaTab />;
    }
    if (activeTab === 'students') {
      return <InstructorStudentsTab />;
    }
    return <InstructorSchoolTab />;
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Eğitmen" showBack />
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <Screen>
        <Header title="Eğitmen ol" showBack />
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            Bu özellik için Supabase yapılandırması gerekir. Geliştirici ortamında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            değişkenlerini ayarlayın ve veritabanı migration&apos;larını uygulayın.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Header title={headerTitle} showBack />
      <View style={[styles.tabBar, { borderBottomColor: colors.cardBorder, paddingVertical: spacing.xs }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' }}
        >
          {INSTRUCTOR_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.85}
                style={[
                  styles.tabPill,
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    backgroundColor: selected ? `${colors.primary}28` : 'transparent',
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: selected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.tabContent}>{renderTabContent()}</View>

      <ConfirmModal
        visible={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAlertModal(null)}
        onConfirm={() => setAlertModal(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabPill: {
    marginRight: 4,
  },
  tabContent: {
    flex: 1,
  },
  tabBodyCenter: {
    flex: 1,
    justifyContent: 'center',
  },
});
