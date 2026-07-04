import { Tabs, router, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { GlassTabBar } from '@/components/ui/GlassTabBar';
import { LiquidGlassFAB } from '@/components/ui/LiquidGlassFAB';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FabProvider } from '@/contexts/FabContext';

/**
 * Main bottom-tab navigation layout.
 */
function TabsLayout() {
  const colors = useThemeColors();
  const segments = useSegments();
  const isAddScreen = segments[segments.length - 1] === 'add';

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Statistics',
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      {!isAddScreen && (
        <LiquidGlassFAB />
      )}
    </View>
  );
}

export default function AppLayout() {
  return (
    <FabProvider>
      <TabsLayout />
    </FabProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
