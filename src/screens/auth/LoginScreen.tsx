import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { GoogleColorIcon } from '../../components/ui/GoogleColorIcon';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, radius, shadows, spacing, typography } = useTheme();

  const showComingSoon = () => {
    Alert.alert('Yakinda', 'Google ve Apple ile giris henuz Supabase tarafina bagli degil. Simdilik e-posta ile devam et.');
  };

  return (
    <Screen>
      <View style={[styles.container, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Onboarding'))}
            style={[styles.backBtn, { borderRadius: radius.full }]}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.content}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <Image source={require('../../../assets/social_dance.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
              Giriş Yap
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
              Socialdance dünyasına katılmak için sana en uygun giriş yöntemini seç.
            </Text>
          </View>

          <View style={{ width: '100%', gap: 12, marginTop: spacing.xxxxl + spacing.xs }}>
            <TouchableOpacity
              onPress={showComingSoon}
              activeOpacity={0.8}
              style={[
                styles.socialButton,
                {
                  backgroundColor: '#1E1E1E',
                  borderWidth: 0.5,
                  borderColor: '#FFFFFF',
                  borderRadius: radius.xl,
                  ...shadows.sm,
                },
              ]}
            >
              <GoogleColorIcon size={22} style={styles.socialIconLeft} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Google ile Devam Et</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={showComingSoon}
              activeOpacity={0.8}
              style={[
                styles.socialButton,
                {
                  backgroundColor: '#1E1E1E',
                  borderWidth: 0.5,
                  borderColor: '#FFFFFF',
                  borderRadius: radius.xl,
                  ...shadows.sm,
                },
              ]}
            >
              <Icon name="apple" size={22} color="#FFFFFF" style={styles.socialIconLeft} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Apple ile Devam Et</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: spacing.xl, width: '100%' }}>
            <LinearGradient
              colors={[colors.background, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientBorder, { borderRadius: radius.xl }]}
            >
              <LinearGradient
                colors={[colors.background, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, { borderRadius: radius.xl - 1 }]}
              >
                <TouchableOpacity onPress={() => navigation.navigate('EmailLogin')} activeOpacity={0.8} style={styles.gradientContent}>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>E-posta ile Devam Et</Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
                </TouchableOpacity>
              </LinearGradient>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
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
  logo: {
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
