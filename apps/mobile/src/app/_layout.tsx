import 'react-native-get-random-values';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors, useResolvedTheme } from '@/hooks/useThemeColors';
import { SyncConflictModal } from '@/components/SyncConflictModal';
import { initSyncEngine } from '@/services/syncEngine';
import { initAccountSyncModule } from '@/features/accounts/accountSyncModule';
import { initBudgetSyncModule } from '@/features/budgets/budgetSyncModule';
import { initTransactionSyncModule } from '@/features/transactions/transactionSyncModule';
import { initRealtimeSync } from '@/services/realtimeService';
import { aiService } from '@/services/ai/LocalAIService';
import { TouchTrackerProvider } from '@/contexts/touchTracker';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const colorScheme = useResolvedTheme();
  const colors = useThemeColors();
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    initialize();
    
    // Initialize feature sync modules
    initAccountSyncModule();
    initBudgetSyncModule();
    initTransactionSyncModule();
    
    initSyncEngine();
    initRealtimeSync();
    aiService.initialize();
  }, []);


  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <TouchTrackerProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          {/* OAuth callback — handles nekofi://auth/callback deep link from Facebook login */}
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="transaction/[id]" />
          <Stack.Screen name="budget/[id]" />
          <Stack.Screen name="ai/chat" />
          <Stack.Screen name="account/add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account/list" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings/appearance" options={{ presentation: 'modal' }} />
        </Stack>
        <SyncConflictModal />
      </TouchTrackerProvider>
    </GestureHandlerRootView>
  );
}
