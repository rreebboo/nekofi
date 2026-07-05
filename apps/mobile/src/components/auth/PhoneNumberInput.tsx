import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { validatePhoneNumber } from '@/constants/providerConfig';

interface PhoneNumberInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onValidityChange?: (valid: boolean) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  accentColor?: string;
}

/**
 * Philippine phone number input with format validation.
 * Accepts 09XXXXXXXXX or +639XXXXXXXXX.
 */
export function PhoneNumberInput({
  value,
  onChangeText,
  onValidityChange,
  disabled = false,
  label = 'Mobile Number',
  placeholder = '09XXXXXXXXX',
  accentColor,
}: PhoneNumberInputProps) {
  const colors = useThemeColors();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const accent = accentColor || colors.primary;
  const showError = touched && value.length > 0 && !validatePhoneNumber(value);
  const showSuccess = value.length > 0 && validatePhoneNumber(value);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^\d+]/g, '');
    onChangeText(cleaned);
    onValidityChange?.(validatePhoneNumber(cleaned));
  };

  const handleBlur = () => {
    setTouched(true);
    setFocused(false);
  };

  const borderColor = showError
    ? colors.error
    : focused
    ? accent
    : showSuccess
    ? colors.success
    : colors.border;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor,
            shadowColor: focused ? accent : 'transparent',
          },
        ]}
      >
        {/* Flag + divider */}
        <View style={styles.prefixGroup}>
          <Text style={styles.flag}>🇵🇭</Text>
          <Text style={[styles.countryCode, { color: colors.textMuted }]}>+63</Text>
          <View style={[styles.prefixDivider, { backgroundColor: colors.borderAlt }]} />
        </View>

        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          keyboardType="phone-pad"
          maxLength={13}
          editable={!disabled}
          autoCorrect={false}
          autoComplete="tel"
        />

        {/* Trailing status icon */}
        {showSuccess && (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        )}
        {showError && (
          <Ionicons name="close-circle" size={20} color={colors.error} />
        )}
      </View>

      {showError ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
          <Text style={[styles.feedbackText, { color: colors.error }]}>
            Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX)
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackRow}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.feedbackText, { color: colors.textMuted }]}>
            Philippine numbers only · 09XXXXXXXXX or +639XXXXXXXXX
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    marginLeft: 2,
  },
  inputWrapper: {
    height: 60,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 0,
  },
  prefixGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 12,
  },
  flag: {
    fontSize: 18,
  },
  countryCode: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  prefixDivider: {
    width: 1,
    height: 20,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 17,
    height: '100%',
    letterSpacing: 0.5,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 2,
  },
  feedbackText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    flex: 1,
  },
});
