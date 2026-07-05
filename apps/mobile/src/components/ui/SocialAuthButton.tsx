import { moderateScale, scale, verticalScale } from '@/utils/responsive';
/**
 * SocialAuthButton — a reusable, branded button for social OAuth providers.
 *
 * Currently supports: 'facebook', 'google'
 * Easily extensible to 'apple', etc.
 *
 * Usage:
 *   <SocialAuthButton provider="facebook" onPress={handleFacebook} loading={fbLoading} />
 *   <SocialAuthButton provider="google" onPress={handleGoogle} loading={googleLoading} />
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
  /** Official brand background color */
  backgroundColor: string;
  /** Text / spinner color */
  textColor: string;
  /** Optional border color (e.g. Google's light grey border on white) */
  borderColor?: string;
  /** Unicode fallback icon character */
  icon: string;
  /** Background color of the icon circle wrapper */
  iconBg: string;
  /** Color of the icon character */
  iconColor: string;
  /** Shadow color for elevation effect */
  shadowColor: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  facebook: {
    label: 'Continue with Facebook',
    // Official Facebook brand blue (as per Meta Brand Guidelines 2024)
    backgroundColor: '#1877F2',
    textColor: '#FFFFFF',
    icon: 'f', // Facebook 'f' — rendered in bold below
    iconBg: '#FFFFFF',
    iconColor: '#1877F2',
    shadowColor: '#1877F2',
  },
  google: {
    label: 'Continue with Google',
    // Official Google brand colors (Google Brand Resource Center 2024)
    backgroundColor: '#FFFFFF',
    textColor: '#3C4043',
    borderColor: '#DADCE0',
    icon: 'G', // Google 'G' — rendered in Google blue below
    iconBg: 'transparent',
    iconColor: '#4285F4', // Google Blue
    shadowColor: '#000000',
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
        config.borderColor ? { borderWidth: 1, borderColor: config.borderColor } : null,
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
        <ActivityIndicator color={config.iconColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {/* Provider icon in a circle */}
          <View style={[styles.iconWrapper, { backgroundColor: config.iconBg }]}>
            <Text style={[styles.icon, { color: config.iconColor }]}>
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
    borderRadius: moderateScale(16),
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(56),
    // Subtle shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  /**
   * Small circle containing the provider initial —
   * mirrors standard social login button design.
   */
  iconWrapper: {
    width: scale(24),
    height: verticalScale(24),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontFamily: 'Inter-Bold',
    fontSize: moderateScale(14),
    lineHeight: 16,
    // Nudge the 'f' character to look visually centered
    marginTop: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: moderateScale(16),
    letterSpacing: 0.2,
  },
});
