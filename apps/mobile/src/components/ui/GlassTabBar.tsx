import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Pressable, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabIcon({ route, isFocused, colors }: { route: any, isFocused: boolean, colors: any }) {
  let iconName: keyof typeof Ionicons.glyphMap = 'home';
  if (route.name === 'index') iconName = isFocused ? 'home' : 'home-outline';
  if (route.name === 'transactions') iconName = isFocused ? 'swap-horizontal' : 'swap-horizontal-outline';
  if (route.name === 'add') iconName = 'add';
  if (route.name === 'budgets') iconName = isFocused ? 'pie-chart' : 'pie-chart-outline';
  if (route.name === 'profile') iconName = isFocused ? 'person' : 'person-outline';

  if (route.name === 'add') {
    return (
      <View style={[styles.addBtnContainer, { shadowColor: '#000' }]}>
        <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={32} color="#FFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={iconName} size={24} color={isFocused ? colors.primary : colors.textMuted} />
    </View>
  );
}

function TabItem({ route, isFocused, options, navigation, colors, index, tabWidth }: any) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Squishy elastic effect for the icon itself
    scale.value = withSpring(0.75, { damping: 10, stiffness: 400 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      style={[styles.tabBtn, { width: tabWidth }, animatedStyle]}
    >
      <TabIcon route={route} isFocused={isFocused} colors={colors} />
    </AnimatedPressable>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const tabWidth = tabBarWidth > 0 ? tabBarWidth / state.routes.length : 0;

  // Liquid Indicator Animation state
  const indicatorLeft = useSharedValue(0);
  const indicatorRight = useSharedValue(48);
  const indicatorOpacity = useSharedValue(state.routes[state.index].name === 'add' ? 0 : 1);
  const previousIndex = useSharedValue(state.index);

  useEffect(() => {
    if (tabWidth > 0) {
      const center = state.index * tabWidth + tabWidth / 2;
      const targetLeft = center - 24;
      const targetRight = center + 24;
      
      const isMovingRight = state.index > previousIndex.value;
      previousIndex.value = state.index;

      if (state.routes[state.index].name === 'add') {
        indicatorOpacity.value = withTiming(0, { duration: 150 });
      } else {
        indicatorOpacity.value = withTiming(1, { duration: 200 });
      }

      if (isMovingRight) {
        // Slugs to the right: right edge moves fast, left edge lags
        indicatorRight.value = withSpring(targetRight, { damping: 14, stiffness: 220 });
        indicatorLeft.value = withSpring(targetLeft, { damping: 18, stiffness: 150 });
      } else if (state.index < previousIndex.value) {
        // Slugs to the left: left edge moves fast, right edge lags
        indicatorLeft.value = withSpring(targetLeft, { damping: 14, stiffness: 220 });
        indicatorRight.value = withSpring(targetRight, { damping: 18, stiffness: 150 });
      } else {
        // Initial setup
        indicatorLeft.value = targetLeft;
        indicatorRight.value = targetRight;
      }
    }
  }, [state.index, tabWidth]);

  const navigateToIndex = (index: number) => {
    if (index >= 0 && index < state.routes.length) {
      const route = state.routes[index];
      const isFocused = state.index === index;
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
        Haptics.selectionAsync();
      }
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) 
    .onBegin(() => {
      if (tabWidth === 0) return;
      indicatorOpacity.value = withTiming(1, { duration: 150 });
      const center = previousIndex.value * tabWidth + tabWidth / 2;
      // Compress the pill into a tight circle when grabbed
      indicatorLeft.value = withSpring(center - 16, { damping: 15, stiffness: 400 });
      indicatorRight.value = withSpring(center + 16, { damping: 15, stiffness: 400 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      if (tabWidth === 0) return;
      const center = (previousIndex.value * tabWidth + tabWidth / 2) + e.translationX;
      // Clamp center to valid bounds
      const clampedCenter = Math.max(tabWidth / 2, Math.min(center, tabWidth * (state.routes.length - 0.5)));
      
      // Dynamic stretching based on velocity
      const stretch = Math.min(Math.abs(e.velocityX) * 0.015, 30);
      
      // Expand edges based on direction of velocity to create leading-edge stretch
      const leftEdge = clampedCenter - 24 - (e.velocityX > 0 ? stretch * 0.2 : stretch);
      const rightEdge = clampedCenter + 24 + (e.velocityX > 0 ? stretch : stretch * 0.2);
      
      indicatorLeft.value = leftEdge;
      indicatorRight.value = rightEdge;
    })
    .onEnd((e) => {
      if (tabWidth === 0) return;
      const currentCenter = (indicatorLeft.value + indicatorRight.value) / 2;
      const finalX = currentCenter + e.velocityX * 0.1;
      const nearestIndex = Math.round((finalX - tabWidth / 2) / tabWidth);
      const clampedIndex = Math.max(0, Math.min(nearestIndex, state.routes.length - 1));
      
      runOnJS(navigateToIndex)(clampedIndex);
      
      // If we dropped it on the current active index, it won't trigger the useEffect state change, so snap back manually
      if (clampedIndex === state.index) {
        if (state.routes[clampedIndex].name === 'add') {
           indicatorOpacity.value = withTiming(0, { duration: 150 });
        }
        const targetCenter = clampedIndex * tabWidth + tabWidth / 2;
        indicatorLeft.value = withSpring(targetCenter - 24, { damping: 14, stiffness: 220 });
        indicatorRight.value = withSpring(targetCenter + 24, { damping: 14, stiffness: 220 });
      }
    });

  const indicatorStyle = useAnimatedStyle(() => {
    const width = indicatorRight.value - indicatorLeft.value;
    // Volume preservation: as width increases (stretches), height decreases (squashes)
    const stretchRatio = Math.max(1, width / 48);
    const squashedHeight = Math.max(28, 48 / Math.pow(stretchRatio, 0.8)); // Power curve for gentle squash

    return {
      left: indicatorLeft.value,
      width: width,
      height: squashedHeight,
      borderRadius: squashedHeight / 2,
      top: (70 - squashedHeight) / 2,
      position: 'absolute',
      opacity: indicatorOpacity.value,
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.shadowView, { shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.3)' }]} />
      
      <BlurView 
        intensity={Platform.OS === 'ios' ? 20 : 35} 
        tint={isDark ? 'dark' : 'light'} 
        experimentalBlurMethod="dimezisBlurView"
        style={[
          styles.blurBackground,
          {
            backgroundColor: isDark ? 'rgba(20, 24, 30, 0.45)' : 'rgba(255, 255, 255, 0.4)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
          }
        ]}
      />

      <GestureDetector gesture={panGesture}>
        <View 
          style={styles.content}
          onLayout={(e) => {
            setTabBarWidth(e.nativeEvent.layout.width);
          }}
        >
          {/* Liquid Morphing Indicator Pill */}
          {tabBarWidth > 0 && (
            <Animated.View style={[indicatorStyle, { zIndex: 1 }]}>
               <View style={[styles.indicator, { backgroundColor: `${colors.primary}30` }]} />
            </Animated.View>
          )}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            
            return (
              <TabItem 
                key={route.key} 
                index={index}
                route={route} 
                isFocused={isFocused} 
                options={options} 
                navigation={navigation} 
                colors={colors} 
                tabWidth={tabWidth}
              />
            );
          })}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 70,
    zIndex: 100,
  },
  shadowView: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  indicator: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2, 
  },
  iconWrapper: {
    padding: 10,
    borderRadius: 20,
  },
  addBtnContainer: {
    transform: [{ translateY: -20 }],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  }
});



