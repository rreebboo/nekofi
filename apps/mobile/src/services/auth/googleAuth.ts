/**
 * Google Authentication Service
 *
 * Uses the native Google Sign-In SDK (@react-native-google-signin/google-signin)
 * to get an ID token, then exchanges it with Supabase via signInWithIdToken.
 *
 * ─── WHY NOT USE THE FACEBOOK PATTERN (signInWithOAuth + WebBrowser) ──────────
 *
 * Facebook auth uses:
 *   1. supabase.auth.signInWithOAuth → Supabase returns an HTTPS URL
 *   2. WebBrowser.openAuthSessionAsync → opens a Chrome Custom Tab
 *   3. Facebook redirects to Supabase → Supabase redirects to nekofi://auth/callback
 *   4. App captures the deep-link URL and calls exchangeCodeForSession(code)
 *
 * For Google, we use a much cleaner native approach:
 *   1. GoogleSignin.signIn() → shows the native OS Google account picker
 *   2. Returns an idToken (a signed JWT from Google)
 *   3. supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
 *   4. Supabase validates the token server-side and creates a session
 *
 * Benefits:
 *   ✅ No browser opens — stays fully in-app
 *   ✅ No deep-link redirect or custom scheme needed
 *   ✅ No PKCE code exchange — simpler, less failure surface
 *   ✅ Server-side token validation — more secure
 *   ✅ Native UX — uses the OS-level Google account picker users trust
 *
 * ─── FLOW ─────────────────────────────────────────────────────────────────────
 *
 *   App → GoogleSignin.signIn()
 *       → Native Google account picker (no browser, stays in-app)
 *       → Returns { idToken }
 *       → supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
 *       → Supabase validates JWT with Google's public keys
 *       → Returns { session, user }
 *       → authStore sets session → auth layout redirects to /(tabs)
 *
 * ─── PREREQUISITES (one-time setup) ──────────────────────────────────────────
 *
 *  1. Google Cloud Console → Create OAuth Consent Screen (External)
 *
 *  2. Google Cloud Console → Create Web Application OAuth Client ID:
 *     Copy Client ID and Client Secret.
 *
 *  3. Google Cloud Console → Create Android OAuth Client ID:
 *     Package: com.nekofi.app
 *     SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25  (debug)
 *
 *  4. Download google-services.json (from Google Cloud Console → Android Client)
 *     Place at: apps/mobile/google-services.json
 *
 *  5. Supabase Dashboard → Authentication → Providers → Google:
 *     Enable, paste Web Client ID and Web Client Secret.
 *
 *  6. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env (use the *Web* Client ID).
 *
 *  7. Run `npx expo run:android` to rebuild with the native Google Sign-In module.
 *
 * ─── COMMON ERROR: DEVELOPER_ERROR ───────────────────────────────────────────
 *
 *  If you see GoogleSignIn error code 10 (DEVELOPER_ERROR), it means one of:
 *    a) Wrong Client ID in configure() — must be the WEB client ID, not Android
 *    b) SHA-1 fingerprint mismatch between Google Cloud Console and your build
 *    c) Package name mismatch (must be com.nekofi.app)
 *    d) google-services.json not placed correctly or not rebuilt after adding it
 */

import {
  GoogleSignin,
  statusCodes,
  type NativeModuleError,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/services/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Configure the Google Sign-In SDK once at module load time.
 *
 * CRITICAL: webClientId MUST be the Web Application client ID from Google Cloud
 * Console — NOT the Android client ID. Using the Android client ID causes
 * DEVELOPER_ERROR (error code 10) because Supabase requires the web client's
 * audience claim in the ID token to validate it.
 */
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  // Request user profile info (name, avatar) in addition to basic auth claims.
  // 'email' and 'profile' are the standard scopes for this.
  scopes: ['email', 'profile'],
  // offlineAccess: false — we only need the idToken, not a refresh token
  // for server-side access. Supabase handles token refresh on its own.
  offlineAccess: false,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoogleAuthResult =
  | { success: true; session: Session; user: User }
  | { success: false; error: GoogleAuthError };

export type GoogleAuthErrorCode =
  | 'CANCELLED'                     // User dismissed the account picker
  | 'NETWORK_ERROR'                 // No internet connection
  | 'PLAY_SERVICES_NOT_AVAILABLE'   // Android device without Google Play Services
  | 'INVALID_TOKEN'                 // idToken was null or Supabase rejected it
  | 'SUPABASE_ERROR'                // Supabase-side error (e.g. Google not enabled)
  | 'NOT_CONFIGURED'                // Google provider not enabled in Supabase
  | 'UNKNOWN';                      // Unexpected runtime error

export interface GoogleAuthError {
  code: GoogleAuthErrorCode;
  message: string; // User-facing message safe to display in an Alert
  raw?: unknown;   // Original error object for debugging
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Initiates the Google native sign-in flow.
 *
 * Handles both new and returning users:
 *   - New Google user → Supabase auto-creates the account
 *   - Existing Google user → Supabase signs them in
 *   - Existing email account with same address → Supabase may link or reject
 *     (behavior depends on Supabase "Automatic linking" setting in your dashboard)
 *
 * @returns GoogleAuthResult — { success: true, session, user } on success,
 *          or { success: false, error } with a typed error code on failure.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    // ── Step 0: Ensure Google Play Services are available ─────────────────
    //
    // Required before calling any GoogleSignin methods on Android.
    // Throws if Play Services are missing or outdated (very rare on modern devices).
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // ── Step 1: Show the native Google account picker ──────────────────────
    //
    // This opens the native OS-level account selector — no browser, no redirect.
    // Returns user info including an idToken (signed JWT from Google).
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message:
            'Google sign-in completed but no authentication token was returned. ' +
            'Please try again.',
          raw: userInfo,
        },
      };
    }

    // ── Step 2: Exchange the Google ID token for a Supabase session ────────
    //
    // Supabase validates the JWT against Google's public keys server-side.
    // If the token is valid, Supabase creates or retrieves the user and
    // returns a full session — no further action needed.
    //
    // This works for both new users (auto-created) and returning users.
    // Full name, email, and avatar_url are automatically populated from
    // the Google profile claims in the token.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

    if (sessionError) {
      // Check for "provider not enabled" type errors
      const isNotConfigured =
        sessionError.message?.toLowerCase().includes('provider') &&
        sessionError.message?.toLowerCase().includes('not enabled');

      return {
        success: false,
        error: {
          code: isNotConfigured ? 'NOT_CONFIGURED' : 'SUPABASE_ERROR',
          message: isNotConfigured
            ? 'Google login is not configured. ' +
              'Please enable it in your Supabase dashboard under Authentication → Providers → Google.'
            : `Authentication failed: ${sessionError.message}`,
          raw: sessionError,
        },
      };
    }

    if (!sessionData?.session || !sessionData?.user) {
      return {
        success: false,
        error: {
          code: 'SUPABASE_ERROR',
          message:
            'Authentication completed but no session was returned. Please try again.',
        },
      };
    }

    return {
      success: true,
      session: sessionData.session,
      user: sessionData.user,
    };

  } catch (error: unknown) {
    // ── Handle typed Google Sign-In SDK errors ─────────────────────────────
    const googleError = error as NativeModuleError;
    console.error('[GoogleSignin Error] Full error object:', error);
    console.error('[GoogleSignin Error] Stringified error:', JSON.stringify(error));
    console.error('[GoogleSignin Error] Error code:', googleError.code);

    if (googleError.code === statusCodes.SIGN_IN_CANCELLED) {
      return {
        success: false,
        error: {
          code: 'CANCELLED',
          message: 'Google sign-in was cancelled.',
        },
      };
    }

    if (googleError.code === statusCodes.IN_PROGRESS) {
      // Sign-in is already in progress (e.g. user tapped the button twice)
      return {
        success: false,
        error: {
          code: 'CANCELLED',
          message: 'Google sign-in is already in progress. Please wait.',
        },
      };
    }

    if (googleError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: {
          code: 'PLAY_SERVICES_NOT_AVAILABLE',
          message:
            'Google Play Services are not available on this device. ' +
            'Please update or install Google Play Services and try again.',
          raw: error,
        },
      };
    }

    // ── Handle network errors ──────────────────────────────────────────────
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes('Network') || error.message.includes('fetch'));

    return {
      success: false,
      error: {
        code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetworkError
          ? 'A network error occurred. Please check your connection and try again.'
          : 'An unexpected error occurred during Google sign-in. Please try again.',
        raw: error,
      },
    };
  }
}

/**
 * Signs out from Google on the device.
 *
 * Call this alongside supabase.auth.signOut() to fully clear the Google
 * sign-in state from the native SDK. Without this, GoogleSignin.signIn()
 * may auto-sign-in the previous user without showing the picker.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Non-critical — if already signed out, silently ignore
  }
}
