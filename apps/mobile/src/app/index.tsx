import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Index route — redirect to app or auth based on session state.
 */
export default function Index() {
  const { session } = useAuthStore();
  return <Redirect href={session ? '/(tabs)' : '/(auth)/welcome'} />;
}
