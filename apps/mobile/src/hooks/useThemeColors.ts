import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/stores/settingsStore';

export function useResolvedTheme() {
  const systemTheme = useColorScheme() ?? 'light';
  const settingsTheme = useSettingsStore((state) => state.theme);
  return settingsTheme === 'system' ? systemTheme : settingsTheme;
}

export function useThemeColors() {
  const theme = useResolvedTheme();
  return Colors[theme];
}
