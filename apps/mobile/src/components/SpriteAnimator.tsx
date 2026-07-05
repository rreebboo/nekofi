import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

export interface SpriteAnimatorProps {
  source: any;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps?: number;
  currentRow?: number; // 0-indexed
}

export const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({
  source,
  frameWidth,
  frameHeight,
  frameCount,
  fps = 12,
  currentRow = 0,
}) => {
  const currentFrame = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(currentFrame);
    currentFrame.value = 0;
    
    if (frameCount > 1) {
      const duration = (frameCount / fps) * 1000;
      currentFrame.value = withRepeat(
        withTiming(frameCount, {
          duration,
          easing: Easing.linear,
        }),
        -1, // Loop indefinitely
        false
      );
    }
  }, [frameCount, fps, currentRow]);

  const animatedStyle = useAnimatedStyle(() => {
    // Math.floor ensures we snap to frames instead of sliding smoothly
    const frame = Math.floor(currentFrame.value) % frameCount;
    return {
      transform: [
        { translateX: -frame * frameWidth },
        { translateY: -currentRow * frameHeight },
      ],
    };
  });

  return (
    <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
      {source ? (
        <Animated.Image
          source={source}
          style={[
            {
              position: 'absolute',
              // We need to ensure the image does not scale relative to the container
              // For a sprite sheet, we don't strictly set width/height on the image
              // assuming it will render at original size. If it doesn't, we might need
              // to set width: totalWidth, height: totalHeight
            },
            animatedStyle,
          ]}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#2E2E2E' }} />
      )}
    </View>
  );
};
