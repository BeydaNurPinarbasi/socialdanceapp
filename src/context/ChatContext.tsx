import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig } from '../services/api/apiClient';
import { formatChatListTime, messageService, type ConversationListItem } from '../services/api/messages';

export interface ChatConversation {
  conversationId: string;
  peerId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
}

interface ChatContextValue {
  chats: ChatConversation[];
  loading: boolean;
  error: string | null;
  refreshChats: () => Promise<void>;
  /** Okundu işaretle (sunucu + yerel liste) */
  markAsRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

function mapRowToChat(row: ConversationListItem): ChatConversation {
  const preview = row.lastBody?.trim() ? row.lastBody : row.lastAt ? '📷 Fotoğraf' : '';
  return {
    conversationId: row.conversationId,
    peerId: row.peerId,
    name: row.peerDisplayName,
    avatar: row.peerAvatarUrl ?? '',
    lastMessage: preview,
    time: formatChatListTime(row.lastAt),
    unread: row.unreadCount,
    isOnline: false,
  };
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshChats = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setChats([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await messageService.listConversations();
      setChats(rows.map(mapRowToChat));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mesajlar yüklenemedi.';
      setError(msg);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await messageService.markConversationRead(conversationId);
      setChats((prev) =>
        prev.map((c) => (c.conversationId === conversationId ? { ...c, unread: 0 } : c)),
      );
    } catch {
      setChats((prev) =>
        prev.map((c) => (c.conversationId === conversationId ? { ...c, unread: 0 } : c)),
      );
    }
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ chats, loading, error, refreshChats, markAsRead }),
    [chats, loading, error, refreshChats, markAsRead],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChats(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error('useChats must be used within ChatProvider');
  }
  return ctx;
}
