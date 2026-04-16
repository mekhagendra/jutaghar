import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import type { User, AuthResponse } from './types';

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

let listeners: Array<(state: AuthState) => void> = [];

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
    if (stored) {
      const parsed = JSON.parse(stored);
      authState = {
        user: parsed.user || null,
        accessToken: parsed.accessToken || null,
        refreshToken: parsed.refreshToken || null,
        isAuthenticated: !!parsed.accessToken,
      };
      // Also ensure tokens are in individual keys for the API client
      if (authState.accessToken) {
        await AsyncStorage.setItem('accessToken', authState.accessToken);
      }
      if (authState.refreshToken) {
        await AsyncStorage.setItem('refreshToken', authState.refreshToken);
      }
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
      accessToken: authState.accessToken,
      refreshToken: authState.refreshToken,
    }));
    if (authState.accessToken) {
      await AsyncStorage.setItem('accessToken', authState.accessToken);
    }
    if (authState.refreshToken) {
      await AsyncStorage.setItem('refreshToken', authState.refreshToken);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
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

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
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
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
  notifyListeners();
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/api/auth/me');
  authState.user = response.data;
  await persistAuthState();
  notifyListeners();
  return response.data;
}
