import React, { createContext, useContext, useState, useCallback } from 'react';
import { mockChats } from '../constants/mockData';

export interface ChatConversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
}

interface ChatContextValue {
  chats: ChatConversation[];
  markAsRead: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<ChatConversation[]>(() => [...mockChats]);

  const markAsRead = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
    );
  }, []);

  const value: ChatContextValue = { chats, markAsRead };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export function useChats(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error('useChats must be used within ChatProvider');
  }
  return ctx;
}
