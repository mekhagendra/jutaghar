import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetch as sslPinnedFetch, type ReactNativeSSLPinning } from 'react-native-ssl-pinning';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/secureStorage';
import { getDeviceAttestationToken } from '@/security/deviceAttestation';

const PROD_API_BASE_URL = 'https://jutaghar.com';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function getDefaultDevBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:8000';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  return 'http://localhost:8000';
}

const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? getDefaultDevBaseUrl() : PROD_API_BASE_URL)
);

export { API_BASE_URL };

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown[];
}

interface HttpResult {
  status: number;
  ok: boolean;
  json: () => Promise<any>;
}

class ApiClient {
  private baseURL: string;
  private readonly fallbackBaseURL: string | null;
  private readonly productionPinnedCerts: string[];

  private readonly authBypassRefreshEndpoints = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/register/request-otp',
    '/api/auth/register/verify-otp',
    '/api/auth/google',
    '/api/auth/forgot-password/request-otp',
    '/api/auth/forgot-password/verify-otp',
    '/api/auth/refresh',
  ]);

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.fallbackBaseURL = __DEV__ && baseURL !== PROD_API_BASE_URL ? PROD_API_BASE_URL : null;

    const certs = (Constants.expoConfig?.extra as { sslPinning?: { certs?: string[] } } | undefined)
      ?.sslPinning?.certs;
    this.productionPinnedCerts = Array.isArray(certs) && certs.length > 0 ? certs : ['jutaghar_prod'];
  }

  private isProductionBuild(): boolean {
    return !__DEV__;
  }

  private isHighValueEndpoint(endpoint: string): boolean {
    return (
      endpoint.startsWith('/api/payment/initiate') ||
      endpoint.startsWith('/api/payment/khalti/verify') ||
      endpoint.startsWith('/api/payment/esewa/verify')
    );
  }

  private async getHeaders(endpoint: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.isProductionBuild() && this.isHighValueEndpoint(endpoint)) {
      const attestationToken = await getDeviceAttestationToken();
      if (attestationToken) {
        headers['X-Device-Attestation'] = attestationToken;
      }
    }

    return headers;
  }

  private async executeRequest(url: string, config: RequestInit): Promise<HttpResult> {
    if (!this.isProductionBuild()) {
      const response = await fetch(url, config);
      return {
        status: response.status,
        ok: response.ok,
        json: async () => {
          try {
            return await response.json();
          } catch {
            return null;
          }
        },
      };
    }

    const sslOptions: ReactNativeSSLPinning.Options = {
      method: (config.method as ReactNativeSSLPinning.Options['method']) || 'GET',
      headers: (config.headers as ReactNativeSSLPinning.Header) || {},
      body: typeof config.body === 'string' ? config.body : undefined,
      timeoutInterval: 15000,
      pkPinning: true,
      sslPinning: {
        certs: this.productionPinnedCerts,
      },
    };

    const response = await sslPinnedFetch(url, sslOptions);
    const bodyText = response.bodyString || response.data || '';

    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      json: async () => {
        if (!bodyText) return null;
        try {
          return JSON.parse(bodyText);
        } catch {
          return null;
        }
      },
    };
  }

  private async handleTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await this.executeRequest(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.success) {
        await setTokens(data.data.accessToken, data.data.refreshToken);
        return data.data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body } = options;
    const headers = await this.getHeaders(endpoint);

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const runRequest = (baseUrl: string) => this.executeRequest(`${baseUrl}${endpoint}`, config);
    const isRouteNotFound = (status: number, payload: any) => {
      if (status !== 404) return false;
      const message = typeof payload?.message === 'string' ? payload.message.toLowerCase() : '';
      return message.includes('route not found');
    };

    let response: HttpResult;
    let requestBaseURL = this.baseURL;
    let retriedWithFallback = false;

    try {
      response = await runRequest(requestBaseURL);
    } catch (error: any) {
      const canRetryWithFallback = !!this.fallbackBaseURL && requestBaseURL !== this.fallbackBaseURL;
      if (canRetryWithFallback) {
        requestBaseURL = this.fallbackBaseURL as string;
        response = await runRequest(requestBaseURL);
        retriedWithFallback = true;
      } else {
        const message =
          typeof error?.message === 'string' && error.message.includes('Network request failed')
            ? `Network request failed. Verify backend is reachable at ${requestBaseURL}.`
            : error?.message || 'Network request failed.';
        throw new Error(message);
      }
    }

    const shouldBypassRefresh = this.authBypassRefreshEndpoints.has(endpoint);

    // Handle token refresh on 401
    if (response.status === 401 && !shouldBypassRefresh) {
      const newToken = await this.handleTokenRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        config.headers = headers;
        response = await runRequest(requestBaseURL);
      } else {
        // Clear tokens on refresh failure
        await clearTokens();
        throw new Error('Session expired. Please login again.');
      }
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (isRouteNotFound(response.status, data) && this.fallbackBaseURL && !retriedWithFallback) {
      requestBaseURL = this.fallbackBaseURL;
      response = await runRequest(requestBaseURL);
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Request failed with status ${response.status} (${requestBaseURL}${endpoint})`
      );
    }

    return data;
  }

  private inferMimeTypeFromUri(uri: string): string {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  async uploadProductImages(imageUris: string[]): Promise<string[]> {
    if (!imageUris.length) return [];

    const formData = new FormData();
    imageUris.forEach((uri, index) => {
      const mimeType = this.inferMimeTypeFromUri(uri);
      formData.append('images', {
        uri,
        name: `product-${Date.now()}-${index}.jpg`,
        type: mimeType,
      } as any);
    });

    const accessToken = await getAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(`${this.baseURL}/api/uploads/products`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Product image upload failed');
    }

    return data?.data?.urls || [];
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;