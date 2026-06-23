import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/**
 * Axios client pre-configured for the Nekofi FastAPI backend.
 * Automatically injects the Supabase JWT token into every request.
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach bearer token
apiClient.interceptors.request.use(async (config) => {
  const session = await SecureStore.getItemAsync('supabase-session');
  if (session) {
    const parsed = JSON.parse(session);
    config.headers.Authorization = `Bearer ${parsed.access_token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('supabase-session');
    }
    return Promise.reject(error);
  }
);
