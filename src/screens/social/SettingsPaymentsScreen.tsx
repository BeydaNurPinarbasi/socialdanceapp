import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';

type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export const SettingsPaymentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();

  const [cardHolder, setCardHolder] = useState('Elif Yılmaz');
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [editCardVisible, setEditCardVisible] = useState(false);

  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [confirmRemoveCard, setConfirmRemoveCard] = useState(false);

  const planTitle =
    plan === 'free'
      ? 'Ücretsiz Plan'
      : plan === 'premium_monthly'
        ? 'Premium (Aylık)'
        : 'Premium (Yıllık)';

  const planSubtitle =
    plan === 'free'
      ? 'Temel özellikler aktif'
      : plan === 'premium_monthly'
        ? 'Tüm premium özellikler • Aylık ödeme'
        : 'Tüm premium özellikler • Yıllık ödeme (daha avantajlı)';

  return (
    <Screen>
      <ConfirmModal
        visible={confirmRemoveCard}
        title="Kartı kaldır"
        message="Kayıtlı kartınızı kaldırmak istediğinize emin misiniz?"
        cancelLabel="Vazgeç"
        confirmLabel="Kaldır"
        onCancel={() => setConfirmRemoveCard(false)}
        onConfirm={() => {
          setCardHolder('');
          setCardNumber('');
          setConfirmRemoveCard(false);
        }}
      />

      <Modal visible={editCardVisible} transparent animationType="fade" onRequestClose={() => setEditCardVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#2C1C2D', borderRadius: radius.xl }]}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>Kartı Düzenle</Text>
            <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.xs }]}>Kart Sahibi</Text>
            <TextInput
              value={cardHolder}
              onChangeText={setCardHolder}
              placeholder="Ad Soyad"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.modalInput}
            />
            <Text style={[typography.label, { color: '#9CA3AF', marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Kart Numarası
            </Text>
            <TextInput
              value={cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}
              onChangeText={(t) => {
                const digits = t.replace(/[^0-9]/g, '').slice(0, 19);
                setCardNumber(digits);
              }}
              keyboardType="number-pad"
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.modalInput}
            />
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <Button
                title="Vazgeç"
                variant="secondary"
                size="md"
                onPress={() => setEditCardVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Kaydet"
                size="md"
                onPress={() => setEditCardVisible(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={planModalVisible} transparent animationType="fade" onRequestClose={() => setPlanModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#2C1C2D', borderRadius: radius.xl }]}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>Plan Seç</Text>
            {[
              { key: 'free' as SubscriptionPlan, title: 'Ücretsiz Plan', desc: 'Temel özellikler' },
              {
                key: 'premium_monthly' as SubscriptionPlan,
                title: 'Premium (Aylık)',
                desc: 'Sınırsız etkinlik + öne çıkan profil',
              },
              {
                key: 'premium_yearly' as SubscriptionPlan,
                title: 'Premium (Yıllık)',
                desc: 'Aynı özellikler, daha avantajlı fiyat',
              },
            ].map((p) => {
              const selected = plan === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.planRow, selected && { borderColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => setPlan(p.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>{p.title}</Text>
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>{p.desc}</Text>
                  </View>
                  {selected && <Icon name="check-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <Button
                title="Kapat"
                variant="secondary"
                size="md"
                onPress={() => setPlanModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Onayla"
                size="md"
                onPress={() => setPlanModalVisible(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Header title="Ödemeler ve Abonelikler" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.body, { color: '#9CA3AF', marginBottom: spacing.lg }]}>
          Kayıtlı ödeme yöntemleriniz ve abonelik durumunuz.
        </Text>
        <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: 'rgba(255,255,255,0.12)' }]}>
          <View style={[styles.row, { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryAlpha20 }]}>
              <Icon name="credit-card" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              {cardNumber ? (
                <>
                  <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                    {cardHolder || 'Kart Sahibi'} •••• {cardNumber.slice(-4)}
                  </Text>
                  <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>Ana ödeme yöntemi</Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
                  Henüz kayıtlı bir kart yok.
                </Text>
              )}
            </View>
            {cardNumber ? (
              <TouchableOpacity hitSlop={12} onPress={() => setEditCardVisible(true)}>
                <Text style={[typography.body, { color: colors.primary }]}>Düzenle</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', padding: spacing.lg, columnGap: spacing.md }}>
            <TouchableOpacity
              style={[styles.row, { flex: 1 }]}
              activeOpacity={0.7}
              onPress={() => setEditCardVisible(true)}
            >
              <Icon name={cardNumber ? 'pencil' : 'plus-circle-outline'} size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.sm }]}>
                {cardNumber ? 'Kartı düzenle' : 'Yeni ödeme yöntemi ekle'}
              </Text>
            </TouchableOpacity>
            {cardNumber ? (
              <TouchableOpacity
                style={[styles.row, { justifyContent: 'flex-end' }]}
                activeOpacity={0.7}
                onPress={() => setConfirmRemoveCard(true)}
              >
                <Icon name="trash-can-outline" size={20} color="#F97373" />
                <Text style={[typography.body, { color: '#F97373', marginLeft: spacing.xs }]}>Kaldır</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Abonelik</Text>
          <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.purpleAlpha }]}>
                <Icon name="crown" size={20} color={colors.purple} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>{planTitle}</Text>
                <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>{planSubtitle}</Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.md }]}>
              Premium abonelik ile etkinlik oluşturma limiti, öne çıkan profil ve daha fazlasına erişin.
            </Text>
            <Button
              title="Planları Görüntüle"
              onPress={() => setPlanModalVisible(true)}
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    marginTop: 8,
    columnGap: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
