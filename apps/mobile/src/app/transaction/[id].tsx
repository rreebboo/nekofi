import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();
  const colors = useThemeColors();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, fontFamily: 'Inter-SemiBold' }}>Transaction Detail: {id}</Text>
    </View>
  );
}
