import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

import { View, ActivityIndicator } from 'react-native';

/**
 * Index route — redirect to app or auth based on session state.
 */
export default function Index() {
  const { session, loading } = useAuthStore();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  return <Redirect href={session ? '/(tabs)' : '/(auth)/welcome'} />;
}
