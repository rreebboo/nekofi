import 'react-native-url-polyfill/auto';
import * as ExpoCrypto from 'expo-crypto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// ─── crypto.subtle polyfill ───────────────────────────────────────────────────
//
// WHY THIS IS NEEDED
// ------------------
// supabase-js PKCE requires crypto.subtle.digest('SHA-256') to hash the
// code_verifier into a code_challenge (S256 method). When crypto.subtle is
// absent, supabase-js falls back to 'plain' (code_challenge = code_verifier).
//
// With 'plain', Supabase's GoTrue server stores the flow_state differently
// and the state value it echoes back in the redirect URL does NOT match the
// state string the client wrote to AsyncStorage. The supabase-js client-side
// check (urlState !== storedState) then throws:
//   "invalid flow state, no valid flow state found"
//
// react-native-get-random-values (imported in _layout.tsx) provides
// crypto.getRandomValues, but NOT crypto.subtle. This polyfill fills the gap
// using expo-crypto's native SHA-256 implementation.
//
// CORRECTNESS
// -----------
// supabase-js calls: crypto.subtle.digest('SHA-256', textEncoder.encode(verifier))
// The verifier is a base64url string (ASCII only). TextEncoder produces one
// byte per character for ASCII, so the byte array == the character codes.
// String.fromCharCode reconstructs the original verifier string, which
// digestStringAsync then hashes identically (UTF-8 = ASCII for this input).
// ─────────────────────────────────────────────────────────────────────────────
if (!globalThis.crypto) {
  (globalThis as any).crypto = {};
}
if (!(globalThis.crypto as any).subtle) {
  (globalThis.crypto as any).subtle = {
    async digest(
      algorithm: string | { name: string },
      data: ArrayBuffer,
    ): Promise<ArrayBuffer> {
      const name = typeof algorithm === 'object' ? algorithm.name : algorithm;
      if (name.toUpperCase() !== 'SHA-256') {
        throw new Error(`crypto.subtle polyfill: unsupported algorithm "${name}".`);
      }
      // Reconstruct the ASCII string from the UTF-8 byte array
      const bytes = new Uint8Array(data);
      const str = Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join('');
      // Compute SHA-256 via expo-crypto and return as ArrayBuffer
      const hex = await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        str,
        { encoding: ExpoCrypto.CryptoEncoding.HEX },
      );
      const result = new Uint8Array(
        hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
      );
      return result.buffer;
    },
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Required for S256 PKCE OAuth on React Native:
    //   1. Generates code_verifier + code_challenge during signInWithOAuth
    //   2. Persists { code_verifier, state } to AsyncStorage
    //   3. Retrieves + validates state in exchangeCodeForSession
    // The crypto.subtle polyfill above ensures SHA-256 (S256) is used.
    flowType: 'pkce',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
