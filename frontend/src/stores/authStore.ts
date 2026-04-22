import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '@/types';
import api from '@/lib/api';
import { clearAccessToken, setAccessToken } from '@/lib/authToken';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  requestSignupOtp: (data: Record<string, unknown>) => Promise<void>;
  verifySignupOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', {
          email,
          password,
        });

        const { user, accessToken } = response.data.data;
        setAccessToken(accessToken);

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      googleLogin: async (credential: string) => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/google', {
          credential,
        });

        const { user, accessToken } = response.data.data;
        setAccessToken(accessToken);

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      requestSignupOtp: async (data: Record<string, unknown>) => {
        await api.post('/api/auth/register/request-otp', data);
      },

      verifySignupOtp: async (email: string, otp: string) => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register/verify-otp', {
          email,
          otp,
        });

        const { user, accessToken } = response.data.data;
        setAccessToken(accessToken);

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        const token = useAuthStore.getState().accessToken;
        clearAccessToken();

        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });

        if (token) {
          api.post('/api/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState>;
        const persistedUser = persisted?.user ?? null;
        return {
          ...currentState,
          ...persisted,
          user: persistedUser,
          accessToken: null,
          isAuthenticated: !!persistedUser,
        };
      },
    }
  )
);
