import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ClassDetails'>;

const mockClass = {
  id: 'c1',
  title: 'Başlangıç Salsa',
  instructor: 'Maria Garcia',
  instructorAvatar: 'https://i.pravatar.cc/150?u=instructor',
  time: '19:00',
  day: 'Pazartesi',
  level: 'Başlangıç',
  duration: '1 saat',
  image: 'https://images.unsplash.com/photo-1547153760-18fc949bc86e?w=400',
  requirements: ['Rahat kıyafet', 'Su'],
};

const CARD_BG = '#311831';
const CARD_BORDER = 'rgba(255,255,255,0.12)';

export const ClassDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.instructorHero}>
          <Image source={{ uri: mockClass.instructorAvatar }} style={styles.instructorPhoto} />
          <View style={styles.instructorOverlay} />
          <View style={styles.instructorInfo}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{mockClass.instructor}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)' }]}>Eğitmen</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={[styles.tag, { backgroundColor: colors.primaryAlpha20 }]}>
            <Text style={[typography.captionBold, { color: colors.primary }]}>{mockClass.level}</Text>
          </View>
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.sm }]}>{mockClass.title}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
            <View style={[styles.detailBox, { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: radius.lg, padding: spacing.md }]}>
              <Icon name="calendar-clock" size={20} color={colors.primary} />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', marginTop: 4 }]}>{mockClass.day} • {mockClass.time}</Text>
            </View>
            <View style={[styles.detailBox, { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: radius.lg, padding: spacing.md }]}>
              <Icon name="timer-outline" size={20} color={colors.primary} />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', marginTop: 4 }]}>{mockClass.duration}</Text>
            </View>
          </View>

          <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl }]}>Gerekli malzemeler</Text>
          {mockClass.requirements.map((r, i) => (
            <View key={i} style={[styles.requirementRow, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm }]}>
              <Icon name="check-circle" size={18} color={colors.success} />
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: 8 }]}>{r}</Text>
            </View>
          ))}

          <Button title="Kayıt Ol" onPress={() => {}} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        </View>
      </ScrollView>
      <View style={[styles.headerOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
        <Header title="" showBack transparent backButtonOverlay alignTop />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  instructorHero: {
    position: 'relative',
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a0d1a',
  },
  instructorPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  instructorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  instructorInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  detailBox: { minWidth: 120 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
