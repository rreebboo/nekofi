import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettingsStore, ThemeMode } from '@/stores/settingsStore';

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { theme, setTheme } = useSettingsStore();

  const options: { label: string; value: ThemeMode; icon: any }[] = [
    { label: 'System Default', value: 'system', icon: 'settings-outline' },
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
        {options.map((option, index) => {
          const isSelected = theme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionItem,
                { borderBottomColor: colors.border },
                index === options.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => setTheme(option.value)}
            >
              <Ionicons name={option.icon} size={22} color={isSelected ? colors.primary : colors.textMuted} />
              <Text style={[styles.optionLabel, { color: isSelected ? colors.primary : colors.text }]}>
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginLeft: 12,
  },
});
