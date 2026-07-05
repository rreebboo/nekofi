import { Tabs, router, useSegments } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassTabBar } from '@/components/ui/GlassTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

/**
 * Main bottom-tab navigation layout.
 */
export default function TabsLayout() {
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
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.push('/add')}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 110, // positioned above the nav bar
    right: 20,
    width: scale(60),
    height: verticalScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
});
