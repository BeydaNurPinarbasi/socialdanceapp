import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Icon } from '../../components/ui/Icon';

export const SettingsPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { spacing, typography, colors } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showNewRepeat, setShowNewRepeat] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState(false);

  // Türkçe büyük harfler dahil kontrol
  const hasUppercase = (p: string) => /[A-ZİÖÜÇŞĞ]/.test(p);

  const requirements = [
    { key: 'length', label: 'En az 8 karakter', check: (p: string) => p.length >= 8 },
    { key: 'upper', label: 'En az 1 büyük harf', check: hasUppercase },
    { key: 'digitOrSymbol', label: 'En az 1 rakam veya sembol', check: (p: string) => /[^a-zA-Z]/.test(p) },
  ] as const;

  const requirementStatus = useMemo(
    () => requirements.map((r) => ({ ...r, met: r.check(newPassword) })),
    [newPassword],
  );

  const validate = () => {
    const next: Record<string, string> = {};

    if (!currentPassword.trim()) {
      next.current = 'Mevcut şifreyi giriniz.';
    }

    if (!newPassword.trim()) {
      next.new = 'Yeni şifreyi giriniz.';
    } else {
      if (newPassword.length < 8) {
        next.new = 'Yeni şifre en az 8 karakter olmalı.';
      } else if (!hasUppercase(newPassword)) {
        next.new = 'Yeni şifre en az 1 büyük harf içermeli.';
      } else if (!/[^a-zA-Z]/.test(newPassword)) {
        next.new = 'Yeni şifre en az 1 rakam veya sembol içermeli.';
      }
    }

    if (!newPasswordRepeat.trim()) {
      next.newRepeat = 'Yeni şifreyi tekrar giriniz.';
    } else if (newPassword && newPasswordRepeat !== newPassword) {
      next.newRepeat = 'Yeni şifreler eşleşmiyor.';
    }

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword &&
      !next.new
    ) {
      next.new = 'Yeni şifre mevcut şifrenizden farklı olmalı.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    // Burada normalde backend isteği atılır.
    setSuccessModal(true);
  };

  return (
    <Screen>
      <ConfirmModal
        visible={successModal}
        title="Şifre güncellendi"
        message="Şifreniz başarıyla güncellendi."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => {
          setSuccessModal(false);
          navigation.goBack();
        }}
        onConfirm={() => {
          setSuccessModal(false);
          navigation.goBack();
        }}
      />
      <Header title="Şifre ve Güvenlik" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.body, { color: '#9CA3AF', marginBottom: spacing.lg }]}>
          Hesap güvenliğinizi korumak için şifrenizi periyodik olarak güncellemenizi öneririz.
        </Text>
        <Input
          label="Mevcut şifre"
          placeholder=""
          leftIcon="lock"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry={!showCurrent}
          rightIcon={showCurrent ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowCurrent((v) => !v)}
          value={currentPassword}
          onChangeText={(t) => {
            setCurrentPassword(t);
            if (errors.current) setErrors((e) => ({ ...e, current: '' }));
          }}
          error={errors.current}
        />
        <Input
          label="Yeni şifre"
          placeholder=""
          leftIcon="key"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry={!showNew}
          rightIcon={showNew ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowNew((v) => !v)}
          value={newPassword}
          onChangeText={(t) => {
            setNewPassword(t);
            if (errors.new) setErrors((e) => ({ ...e, new: '' }));
          }}
          error={errors.new}
        />
        <Input
          label="Yeni şifre (tekrar)"
          placeholder=""
          leftIcon="key"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry={!showNewRepeat}
          rightIcon={showNewRepeat ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowNewRepeat((v) => !v)}
          value={newPasswordRepeat}
          onChangeText={(t) => {
            setNewPasswordRepeat(t);
            if (errors.newRepeat) setErrors((e) => ({ ...e, newRepeat: '' }));
          }}
          error={errors.newRepeat}
        />
        <View
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: 12,
            backgroundColor: 'rgba(15,23,42,0.6)',
            borderWidth: 1,
            borderColor: 'rgba(148,163,184,0.4)',
          }}
        >
          <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>GEREKSİNİMLER</Text>
          {requirementStatus.map(({ key, label, met }) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Icon
                name={met ? 'check-circle' : 'circle-outline'}
                size={18}
                color={met ? '#22c55e' : '#6B7280'}
              />
              <Text
                style={[
                  typography.bodySmall,
                  {
                    marginLeft: spacing.sm,
                    color: met ? '#E5E7EB' : '#9CA3AF',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <Button title="Şifreyi Güncelle" onPress={handleUpdate} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        <View style={{ marginTop: spacing.xl, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
          <Text style={[typography.caption, { color: '#9CA3AF' }]}>
            İki adımlı doğrulama (2FA) yakında eklenecek. Hesabınızı ekstra bir güvenlik katmanıyla koruyabileceksiniz.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({});
