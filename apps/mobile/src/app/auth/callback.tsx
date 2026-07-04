/**
 * OAuth Callback Route — src/app/auth/callback.tsx
 *
 * URL: /auth/callback   (deep link: nekofi://auth/callback?code=xxx)
 *
 * WHY this file exists:
 *   When Facebook OAuth completes, Supabase redirects to nekofi://auth/callback.
 *   expo-router intercepts every deep link and tries to match it to a route file.
 *   Without this file, the router shows "Unmatched Route".
 *
 * WHAT this screen does:
 *   Shows a loading spinner while WebBrowser.openAuthSessionAsync (called in
 *   facebookAuth.ts) captures the URL and runs exchangeCodeForSession.
 *   Once the session is established, authStore's onAuthStateChange fires and
 *   the auth layout automatically redirects to /(tabs).
 *
 *   This screen never needs to parse the URL or call Supabase directly —
 *   it is purely a visual placeholder that satisfies the router.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function OAuthCallbackScreen() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
