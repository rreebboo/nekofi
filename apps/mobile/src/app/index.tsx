import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

import { View, ActivityIndicator } from 'react-native';

/**
 * Index route — redirect to app or auth based on session state.
 */
export default function Index() {
  const { session, loading, isGuest } = useAuthStore();
  const rootNavigationState = useRootNavigationState();
  
  useEffect(() => {
    // Only attempt to redirect if auth has finished loading and the router state is fully mounted
    if (!loading && rootNavigationState?.key) {
      if (session || isGuest) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [loading, session, isGuest, rootNavigationState?.key]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
