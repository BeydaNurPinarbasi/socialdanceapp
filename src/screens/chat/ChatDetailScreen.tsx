import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { useChats } from '../../context/ChatContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

type MessageItem = {
  id: string;
  text?: string;
  imageUri?: string;
  voiceUri?: string;
  durationSeconds?: number;
  isMe: boolean;
  time: string;
};

const mockMessages: MessageItem[] = [
  { id: '1', text: 'Merhaba! Yarın etkinlikte görüşürüz.', isMe: false, time: '14:30' },
  { id: '2', text: 'Merhaba! Evet, orada olacağım 💃', isMe: true, time: '14:32' },
];

type SheetAction = { id: string; label: string; icon: string; onPress: () => void };

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { markAsRead } = useChats();
  const isNewChat = route.params.isNewChat ?? false;
  const [messages, setMessages] = useState(isNewChat ? [] : mockMessages);
  const [input, setInput] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  useEffect(() => {
    if (!isNewChat && route.params.id) {
      markAsRead(route.params.id);
    }
  }, [route.params.id, isNewChat, markAsRead]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), text: input.trim(), isMe: true, time: 'Şimdi' }]);
    setInput('');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriye erişim için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const now = Date.now();
      const newMessages: MessageItem[] = result.assets.map((asset, i) => ({
        id: `${now}-${i}`,
        imageUri: asset.uri,
        isMe: true,
        time: 'Şimdi',
      }));
      setMessages((prev) => [...prev, ...newMessages]);
    }
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Screen>
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
          <View style={[styles.sheetHeader, { marginBottom: spacing.lg }]}>
            <Avatar source={route.params.avatar} size="xl" showBorder />
            <Text style={[typography.h4, { color: '#FFFFFF', marginTop: spacing.md }]}>{route.params.name}</Text>
          </View>
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
            {item.imageUri ? (
              <>
                <Image source={{ uri: item.imageUri }} style={styles.messageImage} resizeMode="cover" />
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            ) : item.voiceUri ? (
              <>
                <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>🎤 Sesli mesaj {formatDuration(item.durationSeconds ?? 0)}</Text>
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            ) : (
              <>
                <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>{item.text}</Text>
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            )}
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
          <TouchableOpacity onPress={pickImage} style={[styles.galleryBtn, { marginLeft: spacing.sm }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="image-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Icon name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const IMAGE_SIZE = 200;

const styles = StyleSheet.create({
  bubble: {},
  messageImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  galleryBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  sheetHeader: {
    alignItems: 'center',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
