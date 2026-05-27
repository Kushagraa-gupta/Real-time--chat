import { create } from 'zustand';
import { api } from '../services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  status: string;
  lastSeen?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (token, user) => {
    localStorage.setItem('chat_token', token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('chat_token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (updatedUser) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } : null,
    }));
  },

  checkAuth: async () => {
    const token = localStorage.getItem('chat_token');
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      return false;
    }

    try {
      set({ isLoading: true });
      const response = await api.get('/auth/me');
      set({
        token,
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error) {
      console.error('Session verification failed:', error);
      localStorage.removeItem('chat_token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },
}));
