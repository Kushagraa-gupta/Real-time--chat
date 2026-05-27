import { create } from 'zustand';
import { User } from './useAuthStore';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  fileUrl?: string | null;
  fileType?: 'image' | 'document' | 'audio' | 'video' | null;
  createdAt: string;
  isSeen: boolean;
  sender: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeChatId: string | null;
  messages: Message[];
  messagesCursor: string | null;
  onlineUsers: Record<string, string>; // userId -> status ("online" | "offline")
  typingUsers: Record<string, { username: string; timestamp: number }[]>; // conversationId -> typers
  isSidebarOpen: boolean;
  
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;
  setActiveChatId: (activeChatId: string | null) => void;
  setMessages: (messages: Message[], nextCursor?: string | null) => void;
  addMessage: (message: Message) => void;
  prependMessages: (messages: Message[], nextCursor?: string | null) => void;
  setOnlineUsers: (users: Record<string, string>) => void;
  setUserOnlineStatus: (userId: string, status: string) => void;
  setTyping: (conversationId: string, userId: string, username: string) => void;
  removeTyping: (conversationId: string, userId: string) => void;
  toggleSidebar: (isOpen?: boolean) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeChatId: null,
  messages: [],
  messagesCursor: null,
  onlineUsers: {},
  typingUsers: {},
  isSidebarOpen: true,

  setConversations: (conversations) => set({ conversations }),

  updateConversation: (conversationId, updates) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId ? { ...c, ...updates } : c
    ),
  })),

  addConversation: (conversation) => set((state) => {
    const exists = state.conversations.find((c) => c.id === conversation.id);
    if (exists) return {};
    return { conversations: [conversation, ...state.conversations] };
  }),

  setActiveChatId: (activeChatId) => set({ activeChatId, messages: [], messagesCursor: null }),

  setMessages: (messages, nextCursor = null) => set({ messages, messagesCursor: nextCursor }),

  prependMessages: (newMessages, nextCursor = null) => set((state) => ({
    messages: [...newMessages, ...state.messages],
    messagesCursor: nextCursor,
  })),

  addMessage: (message) => set((state) => {
    // 1. Add message to current feed if it is the active chat
    const isCurrentActive = state.activeChatId === message.conversationId;
    const updatedMessages = isCurrentActive
      ? [...state.messages.filter((m) => m.id !== message.id), message] // Avoid duplicates
      : state.messages;

    // 2. Update conversation list lastMessage and unread count
    const updatedConversations = state.conversations.map((c) => {
      if (c.id === message.conversationId) {
        return {
          ...c,
          lastMessage: message,
          unreadCount: isCurrentActive ? 0 : c.unreadCount + 1,
          updatedAt: new Date().toISOString(), // trigger ordering update
        };
      }
      return c;
    });

    // Re-sort conversations by updatedAt or latest message
    updatedConversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return {
      messages: updatedMessages,
      conversations: updatedConversations,
    };
  }),

  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  setUserOnlineStatus: (userId, status) => set((state) => ({
    onlineUsers: { ...state.onlineUsers, [userId]: status },
  })),

  setTyping: (conversationId, userId, username) => set((state) => {
    const currentTypers = state.typingUsers[conversationId] || [];
    // Remove if already present, then append to refresh timestamp
    const filtered = currentTypers.filter((t) => (t as any).userId !== userId);
    
    return {
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: [...filtered, { userId, username, timestamp: Date.now() } as any],
      },
    };
  }),

  removeTyping: (conversationId, userId) => set((state) => {
    const currentTypers = state.typingUsers[conversationId] || [];
    return {
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: currentTypers.filter((t) => (t as any).userId !== userId),
      },
    };
  }),

  toggleSidebar: (isOpen) => set((state) => ({
    isSidebarOpen: isOpen !== undefined ? isOpen : !state.isSidebarOpen,
  })),

  incrementUnread: (conversationId) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
    ),
  })),

  clearUnread: (conversationId) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ),
  })),
}));
