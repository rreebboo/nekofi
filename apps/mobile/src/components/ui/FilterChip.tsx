import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: Props) {
  const colors = useThemeColors();

  return (
    <AnimatedPressable 
      style={[
        styles.chip, 
        { backgroundColor: colors.surface, borderColor: colors.borderAlt },
        active && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]} 
      onPress={onPress}
    >
      <Text style={[styles.label, { color: colors.textMuted }, active && styles.labelActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(8), borderRadius: moderateScale(20), borderWidth: 1 },
  label: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13) },
  labelActive: { color: '#fff' },
});
