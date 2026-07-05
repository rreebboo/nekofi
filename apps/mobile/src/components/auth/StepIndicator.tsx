import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';


export type AuthStep = 'identifier' | 'otp' | 'connected';

const STEPS: { key: AuthStep; label: string; icon: string }[] = [
  { key: 'identifier', label: 'Identity', icon: 'person' },
  { key: 'otp', label: 'Verify', icon: 'shield-checkmark' },
  { key: 'connected', label: 'Done', icon: 'checkmark-circle' },
];

interface StepIndicatorProps {
  currentStep: AuthStep;
  /** Provider brand color used for active/done states */
  accentColor?: string;
}

/**
 * Compact floating pill step indicator.
 * Shows icon + label for each step, connected by thin lines.
 */
export function StepIndicator({ currentStep, accentColor }: StepIndicatorProps) {
  const colors = useThemeColors();
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const accent = accentColor || colors.primary;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <React.Fragment key={step.key}>
            <View style={styles.step}>
              {/* Dot / icon */}
              <View
                style={[
                  styles.dot,
                  isDone && { backgroundColor: accent, borderColor: accent },
                  isActive && { backgroundColor: accent, borderColor: accent },
                  !isDone && !isActive && { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={11} color="#fff" />
                ) : isActive ? (
                  <Ionicons name={step.icon as any} size={11} color="#fff" />
                ) : (
                  <View style={[styles.dotInner, { backgroundColor: colors.border }]} />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive || isDone ? colors.text : colors.textMuted },
                  isActive && styles.labelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>

            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: i < currentIndex ? accent : colors.borderAlt },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginHorizontal: 24,
    marginVertical: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  step: {
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: 'Inter-SemiBold',
  },
  line: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 8,
    marginBottom: 14,
    borderRadius: 1,
  },
});
