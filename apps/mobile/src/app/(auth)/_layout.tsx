import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Auth group layout — redirects authenticated users out.
 */
export default function AuthLayout() {
  const { session } = useAuthStore();
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
