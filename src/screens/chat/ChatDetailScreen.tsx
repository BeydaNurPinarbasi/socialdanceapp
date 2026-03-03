import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

const mockMessages = [
  { id: '1', text: 'Merhaba! Yarın etkinlikte görüşürüz.', isMe: false, time: '14:30' },
  { id: '2', text: 'Merhaba! Evet, orada olacağım 💃', isMe: true, time: '14:32' },
];

type SheetAction = { id: string; label: string; icon: string; onPress: () => void };

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const isNewChat = route.params.isNewChat ?? false;
  const [messages, setMessages] = useState(isNewChat ? [] : mockMessages);
  const [input, setInput] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), text: input.trim(), isMe: true, time: 'Şimdi' }]);
    setInput('');
  };

  const closeSheet = () => setSheetVisible(false);

  const sheetActions: SheetAction[] = [
    {
      id: 'profile',
      label: 'Profilini gör',
      icon: 'account-outline',
      onPress: () => {
        closeSheet();
        navigation.navigate('UserProfile', { userId: route.params.id, name: route.params.name, avatar: route.params.avatar });
      },
    },
    {
      id: 'notifications',
      label: notificationsMuted ? 'Bildirimleri aç' : 'Bildirimleri kapat',
      icon: notificationsMuted ? 'bell-outline' : 'bell-off-outline',
      onPress: () => {
        setNotificationsMuted((v) => !v);
        closeSheet();
      },
    },
    {
      id: 'delete',
      label: 'Sohbeti sil',
      icon: 'delete-outline',
      onPress: () => {
        closeSheet();
        Alert.alert('Sohbeti sil', 'Bu sohbet silinecek. Emin misiniz?', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => navigation.goBack() },
        ]);
      },
    },
    {
      id: 'block',
      label: 'Engelle',
      icon: 'block-helper',
      onPress: () => {
        closeSheet();
        Alert.alert('Kullanıcı engellendi', 'Bu kullanıcıdan artık mesaj alamayacaksınız.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      },
    },
    {
      id: 'report',
      label: 'Şikayet et',
      icon: 'flag-outline',
      onPress: () => {
        closeSheet();
        Alert.alert('Şikayet gönderildi', 'İncelenecek ve gerekirse işlem yapılacaktır.', [{ text: 'Tamam' }]);
      },
    },
  ];

  return (
    <Screen>
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
          <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.lg }]}>{route.params.name}</Text>
          {sheetActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={action.onPress}
              style={[styles.sheetRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}
              activeOpacity={0.7}
            >
              <Icon name={action.icon as any} size={22} color="#9CA3AF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.md }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          </View>
        </View>
      </Modal>
      <Header
        title={route.params.name}
        showBack
        onTitlePress={() => setSheetVisible(true)}
        rightIcon="phone"
        onRightPress={() => {}}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.sm, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              {
                alignSelf: item.isMe ? 'flex-end' : 'flex-start',
                backgroundColor: item.isMe ? colors.primary : colors.surfaceSecondary,
                borderRadius: radius.xl,
                padding: spacing.md,
                maxWidth: '80%',
                marginBottom: spacing.xl,
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>{item.text}</Text>
            <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
          </View>
        )}
        />

        <View style={[styles.inputRow, { backgroundColor: colors.background, borderTopColor: colors.borderLight, padding: spacing.md }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.input, { backgroundColor: '#482347', borderRadius: radius.full, color: '#FFF' }]}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Icon name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  bubble: {},
  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
