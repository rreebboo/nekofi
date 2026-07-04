/**
 * Facebook Authentication Service
 *
 * Uses Supabase as the OAuth proxy + expo-web-browser for the browser flow.
 *
 * ─── WHY THE PREVIOUS VERSION REDIRECTED TO localhost:3000 ───────────────────
 *
 * The old code used:
 *   const redirectTo = Linking.createURL('/');
 *
 * expo-router's Linking.createURL reads the "router.origin" value from app.json
 * to build URLs. In this project, app.json contains:
 *   "extra": { "router": { "origin": false } }
 *
 * When "origin" is false, expo-router falls back to the Metro bundler's web
 * server URL — which is http://localhost:3000 during development.
 * So Linking.createURL('/') was producing "http://localhost:3000/" instead of
 * the native deep-link "nekofi:///".
 *
 * Supabase then sent the OAuth callback to http://localhost:3000 — a web server
 * that doesn't exist on the Android device — causing ERR_CONNECTION_REFUSED.
 *
 * ─── THE FIX ─────────────────────────────────────────────────────────────────
 *
 * Hard-code the redirect URI as the native custom scheme directly:
 *   nekofi://auth/callback
 *
 * This bypasses Linking.createURL entirely and always produces the correct
 * native deep-link on Android and iOS, regardless of the "origin" setting or
 * the development/production environment.
 *
 * ─── FLOW ────────────────────────────────────────────────────────────────────
 *
 *   App → supabase.auth.signInWithOAuth (skipBrowserRedirect: true)
 *       → WebBrowser.openAuthSessionAsync(supabaseUrl, 'nekofi://auth/callback')
 *       → Browser → Facebook login page
 *       → Facebook → Supabase HTTPS callback (already registered with Facebook)
 *       → Supabase → nekofi://auth/callback?code=xxx deep link
 *       → App captures the URL
 *       → extract `code` from redirect URL
 *       → supabase.auth.exchangeCodeForSession(code)
 *       → Session established
 *
 * ─── PREREQUISITES (one-time dashboard setup) ────────────────────────────────
 *
 *  1. Supabase Dashboard → Authentication → Providers → Facebook:
 *     Enable, paste Facebook App ID and App Secret.
 *
 *  2. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *     Add:  nekofi://auth/callback
 *
 *  3. Meta Developer Console → Facebook Login → Settings → Valid OAuth Redirect URIs:
 *     Add:  https://vqqjwnytdncrdwteoija.supabase.co/auth/v1/callback
 *     (Facebook sees only this HTTPS URL — never the custom scheme directly)
 */

import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// Required: dismisses the browser on iOS after the OAuth redirect completes
WebBrowser.maybeCompleteAuthSession();

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The deep-link URI Supabase will redirect to after the Facebook OAuth flow.
 *
 * IMPORTANT: Do NOT use Linking.createURL() here. With "router.origin": false
 * in app.json, Linking.createURL('/') produces "http://localhost:3000/" which
 * causes ERR_CONNECTION_REFUSED on Android.
 *
 * This literal string must match EXACTLY what is added to:
 *   Supabase → Authentication → URL Configuration → Redirect URLs
 */
const REDIRECT_URL = 'nekofi://auth/callback';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FacebookAuthResult =
  | { success: true; session: Session; user: User }
  | { success: false; error: FacebookAuthError };

export type FacebookAuthErrorCode =
  | 'CANCELLED'       // User dismissed the browser
  | 'NETWORK_ERROR'   // No internet connection
  | 'INVALID_TOKEN'   // Code exchange failed or returned no session
  | 'EXPIRED_TOKEN'   // Supabase rejected the token as expired
  | 'SUPABASE_ERROR'  // Supabase-side error (e.g. Facebook not enabled)
  | 'NOT_CONFIGURED'  // Facebook provider not enabled in Supabase
  | 'UNKNOWN';        // Unexpected runtime error

export interface FacebookAuthError {
  code: FacebookAuthErrorCode;
  message: string; // User-facing message safe to display in an Alert
  raw?: unknown;   // Original error object for debugging
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Initiates the Facebook OAuth login flow via Supabase.
 *
 * @returns FacebookAuthResult — { success: true, session, user } on success,
 *          or { success: false, error } with a typed error code on failure.
 */
export async function signInWithFacebook(): Promise<FacebookAuthResult> {
  try {
    // ── Step 1: Get the Supabase-managed OAuth URL ─────────────────────────
    //
    // skipBrowserRedirect: true means Supabase gives us the URL but does NOT
    // open the browser itself. We open it manually so we can capture the result
    // via openAuthSessionAsync's return value.
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
        scopes: 'public_profile email',
      },
    });

    if (oauthError) {
      return {
        success: false,
        error: {
          code: 'SUPABASE_ERROR',
          message: `Failed to start Facebook login: ${oauthError.message}`,
          raw: oauthError,
        },
      };
    }

    if (!oauthData?.url) {
      return {
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message:
            'Facebook login is not configured. ' +
            'Please enable it in your Supabase dashboard under Authentication → Providers → Facebook.',
        },
      };
    }

    // ── Step 2: Open the OAuth URL in the device browser ──────────────────
    //
    // openAuthSessionAsync opens the URL in a Chrome Custom Tab (Android) or
    // SFSafariViewController (iOS). It monitors for a redirect that starts with
    // REDIRECT_URL and captures the full resulting URL automatically.
    const browserResult = await WebBrowser.openAuthSessionAsync(
      oauthData.url,
      REDIRECT_URL,
    );

    // ── Handle browser result ──────────────────────────────────────────────

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return {
        success: false,
        error: {
          code: 'CANCELLED',
          message: 'Facebook login was cancelled.',
        },
      };
    }

    if (browserResult.type !== 'success') {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'An unexpected error occurred during Facebook login. Please try again.',
          raw: browserResult,
        },
      };
    }

    // ── Step 3: Exchange the authorization code for a session ──────────────
    //
    // Supabase PKCE expects the raw `code` query param — NOT the full redirect
    // URL. Passing browserResult.url makes GoTrue look up flow_state by the
    // entire string (e.g. "nekofi://auth/callback?code=…"), which fails with
    // "invalid flow state, no valid flow state found" even though Facebook auth
    // already succeeded and the user was created server-side.
    const redirectParams = new URL(browserResult.url).searchParams;
    let authCode = redirectParams.get('code');
    if (!authCode) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication completed but no authorization code was returned. Please try again.',
          raw: browserResult.url,
        },
      };
    }
    // iOS custom-scheme redirects can append a trailing "#" as "%23" to the code.
    authCode = authCode.replace(/(%23|#)$/, '');

    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(authCode);
    if (sessionError) {
      const isExpired =
        sessionError.message?.toLowerCase().includes('expired') ?? false;
      return {
        success: false,
        error: {
          code: isExpired ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN',
          message: isExpired
            ? 'Your Facebook session has expired. Please sign in again.'
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
          message: 'Authentication completed but no session was returned. Please try again.',
        },
      };
    }

    return {
      success: true,
      session: sessionData.session,
      user: sessionData.user,
    };

  } catch (error: unknown) {
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes('Network') || error.message.includes('fetch'));

    return {
      success: false,
      error: {
        code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetworkError
          ? 'A network error occurred. Please check your connection and try again.'
          : 'An unexpected error occurred. Please try again.',
        raw: error,
      },
    };
  }
}
