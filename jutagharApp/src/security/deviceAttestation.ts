import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

let cachedAttestationToken: string | null = null;
let bootstrapPromise: Promise<string | null> | null = null;

const isProdBuild = !__DEV__;

const extra = (Constants.expoConfig?.extra || {}) as {
  playIntegrity?: { cloudProjectNumber?: string };
};

function createChallenge(): string {
  const appId = Application.applicationId || 'jutaghar.app';
  return `${appId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

async function requestAndroidIntegrityToken(): Promise<string | null> {
  const module = await import('react-native-google-play-integrity');
  const challenge = createChallenge();
  const cloudProjectNumber = extra.playIntegrity?.cloudProjectNumber;

  if (cloudProjectNumber) {
    return module.requestIntegrityToken(challenge, cloudProjectNumber as `${number}`);
  }

  return module.requestIntegrityToken(challenge);
}

async function requestIosAttestationToken(): Promise<string | null> {
  const module = await import('react-native-app-attest');
  const keyId = await module.generateAppAttestKey();
  if (!keyId) {
    return null;
  }

  return module.generateAppAssertion(keyId, createChallenge());
}

async function requestAttestationToken(): Promise<string | null> {
  if (!isProdBuild) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      return await requestAndroidIntegrityToken();
    }

    if (Platform.OS === 'ios') {
      return await requestIosAttestationToken();
    }
  } catch {
    // Soft-check only: failures should not block app startup.
    return null;
  }

  return null;
}

export async function initializeDeviceAttestation(): Promise<string | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = requestAttestationToken().then((token) => {
      cachedAttestationToken = token;
      return token;
    });
  }

  return bootstrapPromise;
}

export async function getDeviceAttestationToken(): Promise<string | null> {
  if (cachedAttestationToken) {
    return cachedAttestationToken;
  }

  return initializeDeviceAttestation();
}
