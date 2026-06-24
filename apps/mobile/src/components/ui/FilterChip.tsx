import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: Props) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity 
      style={[
        styles.chip, 
        { backgroundColor: colors.surface, borderColor: colors.borderAlt },
        active && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]} 
      onPress={onPress}
    >
      <Text style={[styles.label, { color: colors.textMuted }, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13 },
  labelActive: { color: '#fff' },
});
