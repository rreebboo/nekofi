import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
}

/**
 * 6-box OTP digit input.
 * Auto-advances focus on each digit entry.
 * Auto-retreats on backspace.
 * Accepts any 6 digits (no fixed code validation).
 */
export function OTPInput({ value, onChange, disabled = false, length = 6 }: OTPInputProps) {
  const colors = useThemeColors();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      // Remove last digit and go back
      const newVal = value.slice(0, -1);
      onChange(newVal);
      if (index > 0 && value.length <= index) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleChange = (index: number, text: string) => {
    // Only accept single digits
    const digit = text.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    // Build new OTP string
    const arr = value.split('').concat(Array(length).fill('')).slice(0, length);
    arr[index] = digit;
    const newVal = arr.slice(0, index + 1).join('');
    onChange(newVal);

    // Advance focus
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      inputRefs.current[index]?.blur();
    }
  };

  const focusFirst = () => {
    const firstEmpty = digits.findIndex((d) => d === '');
    const target = firstEmpty === -1 ? length - 1 : firstEmpty;
    inputRefs.current[target]?.focus();
  };

  return (
    <Pressable style={styles.container} onPress={focusFirst}>
      {digits.map((digit, i) => {
        const isFocused = focusedIndex === i;
        const isFilled = digit !== '';
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: colors.surface,
                borderColor: isFocused
                  ? colors.primary
                  : isFilled
                  ? colors.border
                  : colors.borderAlt,
              },
            ]}
          >
            <TextInput
              ref={(ref) => { inputRefs.current[i] = ref; }}
              style={[
                styles.cellInput,
                { color: colors.text },
              ]}
              value={digit}
              onChangeText={(text) => handleChange(i, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!disabled}
              caretHidden
              selectTextOnFocus
              textAlign="center"
              contextMenuHidden
            />
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  cell: {
    width: 48,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellInput: {
    width: '100%',
    height: '100%',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    textAlign: 'center',
  },
});
