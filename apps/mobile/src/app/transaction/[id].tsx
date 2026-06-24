import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Transaction Detail: {id}</Text>
    </View>
  );
}
