import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CountdownTimerProps {
  /** Countdown duration in seconds */
  duration?: number;
  /** Called when the user taps "Resend Code" */
  onResend: () => void;
  /** Whether to restart the countdown (changes to this prop trigger a reset) */
  resetKey?: number;
  disabled?: boolean;
}

/**
 * Countdown timer with "Resend Code" button.
 * Shows "Resend Code" button when timer expires.
 * Resend simply restarts the timer and calls onResend().
 */
export function CountdownTimer({
  duration = 60,
  onResend,
  resetKey = 0,
  disabled = false,
}: CountdownTimerProps) {
  const colors = useThemeColors();
  const [seconds, setSeconds] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setSeconds(duration);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [duration]);

  // Start on mount and when resetKey changes
  useEffect(() => {
    start();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [start, resetKey]);

  const handleResend = () => {
    if (disabled) return;
    onResend();
    start();
  };

  const expired = seconds === 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = minutes > 0 ? `${pad(minutes)}:${pad(secs)}` : `${pad(secs)}s`;

  return (
    <View style={styles.container}>
      {expired ? (
        <Pressable
          onPress={handleResend}
          disabled={disabled}
          style={({ pressed }) => [
            styles.resendButton,
            { borderColor: colors.primary },
            pressed && { opacity: 0.7 },
            disabled && { opacity: 0.4 },
          ]}
        >
          <Text style={[styles.resendText, { color: colors.primary }]}>
            Resend Code
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.timerText, { color: colors.textMuted }]}>
          Resend code in{' '}
          <Text style={[styles.timerCount, { color: colors.text }]}>{timeStr}</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  timerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  timerCount: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  resendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});
