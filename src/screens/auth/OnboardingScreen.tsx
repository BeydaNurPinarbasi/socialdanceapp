import React, { useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const IntroStepWelcome: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, typography, shadows } = useTheme();

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: spacing.sm, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0, marginTop: 116 }]}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../../assets/social_dance.png')}
          style={styles.onboardingLogoStandalone}
          resizeMode="contain"
        />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
          Hoş Geldiniz
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: 0,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Dans etmeyi seven insanları bir araya getiren{'\n'}sosyal dans topluluğuna ilk adımını attın.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxxxl + spacing.xs, width: '100%' }}>
        <Button title="İleri" onPress={next} fullWidth size="lg" iconRight="arrow-right" />
      </View>
    </View>
  );
};

const IntroStepAbout: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, typography, shadows } = useTheme();

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: spacing.lg, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0, marginTop: 110 }]}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../../assets/social_dance.png')}
          style={styles.onboardingLogoStandalone}
          resizeMode="contain"
        />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
          Dans etmeye hazır mısın?
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: spacing.sm,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Dans etkinliklerini keşfet, yeni partnerler bul{'\n'}ve toplulukla bağlan. Seni en uygun etkinlikler{'\n'}ve insanlarla bir araya getiriyoruz.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxxxl + spacing.xs, width: '100%' }}>
        <Button title="İleri" onPress={next} fullWidth size="lg" iconRight="arrow-right" />
      </View>
    </View>
  );
};

const IntroStepGetStarted: React.FC<{ goToLogin: () => void }> = ({ goToLogin }) => {
  const { spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.stepContainer,
        { paddingHorizontal: spacing.lg, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0, marginTop: 110 },
      ]}
    >
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image source={require('../../../assets/social_dance.png')} style={styles.onboardingLogoStandalone} resizeMode="contain" />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
          Hazırsan başlayalım
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: spacing.sm,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Giriş yap ve etkinlikleri keşfetmeye başla.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxxxl + spacing.xs, width: '100%' }}>
        <Button title="Hemen Başla" onPress={goToLogin} fullWidth size="lg" iconRight="arrow-right" />
      </View>
    </View>
  );
};

export const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors, spacing, radius } = useTheme();
  const initialStep = route.params?.startFromStep ?? 1;
  const [step, setStep] = useState(Math.min(3, Math.max(1, initialStep)));

  const stepRef = useRef(step);
  stepRef.current = step;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Ekranı sağa çekme hareketini daha kolay yakala
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 30) {
          const currentStep = stepRef.current;
          // Sağa kaydırma: geri git
          if (currentStep > 1) {
            setStep((prev) => Math.max(1, prev - 1));
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      },
    })
  ).current;

  return (
    <Screen>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {step > 1 ? (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={[styles.backBtn, { borderRadius: radius.full }]}
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <View style={styles.dots}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === step ? 32 : 8,
                  backgroundColor: i === step ? colors.primary : colors.primaryAlpha20,
                  borderRadius: radius.full,
                },
              ]}
            />
          ))}
        </View>

          <View style={styles.backBtn} />
        </View>

        <View style={[styles.stepWrapper, { paddingHorizontal: spacing.lg }]}>
          {step === 1 && <IntroStepWelcome next={() => setStep(2)} />}
          {step === 2 && <IntroStepAbout next={() => setStep(3)} />}
          {step === 3 && <IntroStepGetStarted goToLogin={() => navigation.navigate('Login')} />}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
  },
  stepWrapper: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepContainerScroll: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepButtonContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    width: 128,
    height: 128,
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permImageContainer: {
    alignItems: 'center',
  },
  permImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  onboardingLogoStandalone: {
    width: 280,
    height: 150,
  },
  socialButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconLeft: {
    marginRight: 19,
  },
  gradientBorder: {
    padding: 1,
    width: '100%',
    overflow: 'hidden',
  },
  gradientButton: {
    height: 56,
    overflow: 'hidden',
    width: '100%',
  },
  gradientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
