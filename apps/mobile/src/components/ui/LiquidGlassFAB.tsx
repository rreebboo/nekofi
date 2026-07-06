import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors, useResolvedTheme } from '@/hooks/useThemeColors';
import { useFab } from '@/contexts/FabContext';
import * as Haptics from 'expo-haptics';

export function LiquidGlassFAB() {
  const { fabVisible } = useFab();
  const colors = useThemeColors();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add');
  };

  const animatedStyle = useAnimatedStyle(() => {
    // Shrinks smoothly into its center and pops up
    const scale = interpolate(fabVisible.value, [0, 1], [0, 1], Extrapolation.EXTEND);
    const opacity = interpolate(fabVisible.value, [0, 0.3, 1], [0, 1, 1], Extrapolation.CLAMP);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable onPress={handlePress}>
        {({ pressed }) => (
          <Animated.View style={[styles.fab, pressed && { transform: [{ scale: 0.92 }] }]}>
            <BlurView 
              intensity={Platform.OS === 'ios' ? 80 : 35} 
              tint={isDark ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFillObject} 
            />
            <View 
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: colors.primary + 'B3', // 70% opacity of Yellow Green
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)',
                  borderRadius: 30,
                }
              ]}
            />
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
