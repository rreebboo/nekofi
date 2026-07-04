/**
 * SocialAuthButton — a reusable, branded button for social OAuth providers.
 *
 * Currently supports: 'facebook'
 * Easily extensible to 'google', 'apple', etc.
 *
 * Usage:
 *   <SocialAuthButton provider="facebook" onPress={handleFacebook} loading={fbLoading} />
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

// ─── Provider Config ──────────────────────────────────────────────────────────

interface ProviderConfig {
  label: string;
  /** Official brand color */
  backgroundColor: string;
  /** Text / icon color — usually white */
  textColor: string;
  /** Unicode fallback icon; replace with a real SVG/icon library if desired */
  icon: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  facebook: {
    label: 'Continue with Facebook',
    // Official Facebook brand blue (as per Meta Brand Guidelines 2024)
    backgroundColor: '#1877F2',
    textColor: '#FFFFFF',
    icon: 'f', // Facebook 'f' — rendered in bold below
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SocialAuthButtonProps {
  provider: keyof typeof PROVIDERS;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SocialAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}: SocialAuthButtonProps) {
  const config = PROVIDERS[provider];

  if (!config) {
    console.warn(`SocialAuthButton: unknown provider "${provider}"`);
    return null;
  }

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: config.backgroundColor },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityLabel={config.label}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={config.textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {/* Facebook 'f' logo rendered as bold text in a circle */}
          <View style={styles.iconWrapper}>
            <Text style={[styles.icon, { color: config.backgroundColor }]}>
              {config.icon}
            </Text>
          </View>
          <Text style={[styles.label, { color: config.textColor }]}>
            {config.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    // Subtle shadow for depth
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /**
   * Small white circle containing the 'f' letter —
   * mirrors the standard Facebook button design.
   */
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    lineHeight: 16,
    // Nudge the 'f' character to look visually centered
    marginTop: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
