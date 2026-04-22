import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '@/types';
import api from '@/lib/api';
import { clearAccessToken, setAccessToken } from '@/lib/authToken';

/** Thrown by login() when the backend requires a second MFA step. */
export class MfaRequiredError extends Error {
  constructor(public readonly mfaToken: string) {
    super('MFA_REQUIRED');
    this.name = 'MfaRequiredError';
  }
}

interface MfaLoginResponse {
  success: boolean;
  mfa_required: true;
  mfa_token: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  mfaLoginVerify: (mfaToken: string, code: string) => Promise<void>;
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
        const response = await api.post<{ success: boolean; data?: AuthResponse } & Partial<MfaLoginResponse>>('/api/auth/login', {
          email,
          password,
        });

        if (response.data.mfa_required) {
          throw new MfaRequiredError(response.data.mfa_token!);
        }

        const { user, accessToken } = response.data.data!;
        setAccessToken(accessToken);

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      mfaLoginVerify: async (mfaToken: string, code: string) => {
        const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/mfa/login-verify', {
          mfa_token: mfaToken,
          code,
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
