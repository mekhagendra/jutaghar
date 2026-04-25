import api from '@/api';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/secureStorage';
import type { AuthResponse, User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'jutaghar_auth';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// In-memory auth state
let authState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

let listeners: ((state: AuthState) => void)[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener({ ...authState }));
}

export function subscribe(listener: (state: AuthState) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getAuthState(): AuthState {
  return { ...authState };
}

export async function loadAuthState(): Promise<AuthState> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const [storedAccessToken, storedRefreshToken] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
    ]);

    if (stored) {
      const parsed = JSON.parse(stored);
      authState = {
        user: parsed.user || null,
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: !!storedAccessToken,
      };
    } else {
      authState = {
        user: null,
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: !!storedAccessToken,
      };
    }
  } catch {
    // Ignore parse errors
  }
  notifyListeners();
  return { ...authState };
}

async function persistAuthState() {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      user: authState.user,
    }));
    await setTokens(authState.accessToken, authState.refreshToken);
  } catch {
    // Ignore storage errors
  }
}

export interface MfaRequiredPayload {
  mfa_required: true;
  mfa_token: string;
}

export async function login(email: string, password: string): Promise<User | MfaRequiredPayload> {
  const response = await api.post<AuthResponse | MfaRequiredPayload>('/api/auth/login', { email, password });
  // Backend returns MFA challenges at the top level: { success, mfa_required, mfa_token }
  // Normal logins are wrapped as { success, data: { user, accessToken, refreshToken } }.
  const envelope = response as unknown as { mfa_required?: boolean; mfa_token?: string };
  if (envelope.mfa_required && envelope.mfa_token) {
    return { mfa_required: true, mfa_token: envelope.mfa_token };
  }

  const { user, accessToken, refreshToken } = response.data as AuthResponse;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export async function mfaLoginVerify(mfaToken: string, code: string): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/mfa/login-verify', {
    mfa_token: mfaToken,
    code,
  });
  const { user, accessToken, refreshToken } = response.data;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/register', data);
  const { user, accessToken, refreshToken } = response.data;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export async function requestSignupOtp(data: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}): Promise<void> {
  await api.post('/api/auth/register/request-otp', data);
}

export async function verifySignupOtp(email: string, otp: string): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/register/verify-otp', { email, otp });
  const { user, accessToken, refreshToken } = response.data;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export async function requestForgotPasswordOtp(email: string): Promise<void> {
  await api.post('/api/auth/forgot-password/request-otp', { email });
}

export async function verifyForgotPasswordOtp(email: string, otp: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/forgot-password/verify-otp', {
    email,
    otp,
    newPassword,
  });
}

export async function googleLogin(idToken: string): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/google', { credential: idToken });
  const { user, accessToken, refreshToken } = response.data;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export interface AppleLoginPayload {
  identityToken: string;
  authorizationCode?: string | null;
  user?: string | null;
  email?: string | null;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}

export async function appleLogin(payload: AppleLoginPayload): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/apple', payload);
  const { user, accessToken, refreshToken } = response.data;

  authState = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };

  await persistAuthState();
  notifyListeners();
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout', {
      refreshToken: authState.refreshToken,
    });
  } catch {
    // Ignore logout API errors
  }

  authState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };

  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  await clearTokens();
  notifyListeners();
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/api/auth/me');
  authState.user = response.data;
  await persistAuthState();
  notifyListeners();
  return response.data;
}
