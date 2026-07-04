import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  scaleAmount?: number;
  children?: React.ReactNode;
}

export function AnimatedPressable({ 
  children, 
  style, 
  scaleAmount = 0.97, // Match the subtle scale
  onPressIn, 
  onPressOut, 
  ...rest 
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPress
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleAmount, { damping: 20, stiffness: 300 });
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        if (onPressOut) onPressOut(e);
      }}
      style={typeof style === 'function' ? (state) => [style(state), animatedStyle] : [style, animatedStyle]}
    >
      {children}
    </AnimatedPress>
  );
}
