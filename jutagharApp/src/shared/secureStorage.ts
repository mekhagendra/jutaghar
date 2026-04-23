import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export async function setTokens(access: string | null, refresh: string | null): Promise<void> {
  if (access) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access, secureOptions);
  } else {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, secureOptions);
  }

  if (refresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh, secureOptions);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, secureOptions);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY, secureOptions);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, secureOptions);
}

export async function clearTokens(): Promise<void> {
  await setTokens(null, null);
}

export async function migrateLegacyAsyncStorageTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}
