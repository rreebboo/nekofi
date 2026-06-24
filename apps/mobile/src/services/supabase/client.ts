import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Custom secure storage adapter for Supabase auth tokens.
 * Uses Expo SecureStore for encrypted on-device storage.
 * Chunks values to bypass the 2048 byte limit on some platforms.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) return item;

      let result = '';
      let chunkIndex = 0;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${chunkIndex}`);
        if (!chunk) break;
        result += chunk;
        chunkIndex++;
      }
      return result || null;
    } catch (e) {
      console.error('Error getting item from SecureStore', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const CHUNK_SIZE = 1000;
      
      if (value.length < CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        
        // Clean up any chunks from previous large values
        let chunkIndex = 0;
        while (true) {
          const chunkKey = `${key}_chunk_${chunkIndex}`;
          const chunk = await SecureStore.getItemAsync(chunkKey);
          if (!chunk) break;
          await SecureStore.deleteItemAsync(chunkKey);
          chunkIndex++;
        }
        return;
      }
      
      await SecureStore.deleteItemAsync(key);
      
      let chunkIndex = 0;
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        const chunk = value.substring(i, i + CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunk_${chunkIndex}`, chunk);
        chunkIndex++;
      }
      
      // Clean up extra chunks if new value is smaller
      while (true) {
        const chunkKey = `${key}_chunk_${chunkIndex}`;
        const chunk = await SecureStore.getItemAsync(chunkKey);
        if (!chunk) break;
        await SecureStore.deleteItemAsync(chunkKey);
        chunkIndex++;
      }
    } catch (e) {
      console.error('Error setting item in SecureStore', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
      let chunkIndex = 0;
      while (true) {
        const chunkKey = `${key}_chunk_${chunkIndex}`;
        const chunk = await SecureStore.getItemAsync(chunkKey);
        if (!chunk) break;
        await SecureStore.deleteItemAsync(chunkKey);
        chunkIndex++;
      }
    } catch (e) {
      console.error('Error removing item from SecureStore', e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
