import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL
// For Android emulator use 10.0.2.2, for physical device use your machine's IP
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000'
  : 'https://dev.jutaghar.com';

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

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        return data.data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body } = options;
    const headers = await this.getHeaders();

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    let response = await fetch(`${this.baseURL}${endpoint}`, config);

    // Handle token refresh on 401
    if (response.status === 401) {
      const newToken = await this.handleTokenRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        config.headers = headers;
        response = await fetch(`${this.baseURL}${endpoint}`, config);
      } else {
        // Clear tokens on refresh failure
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        throw new Error('Session expired. Please login again.');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
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

export const api = new ApiClient(API_BASE_URL);
export default api;
