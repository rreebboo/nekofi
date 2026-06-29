import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Auth group layout — redirects authenticated users out.
 */
export default function AuthLayout() {
  const { session } = useAuthStore();
  
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  if (session) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
