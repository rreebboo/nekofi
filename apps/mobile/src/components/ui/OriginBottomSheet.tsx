import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Pressable, Dimensions, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OriginCoordinate {
  x: number;
  y: number;
}

interface OriginBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  origin: OriginCoordinate | null;
  children: React.ReactNode;
}

export function OriginBottomSheet({ visible, onClose, origin, children }: OriginBottomSheetProps) {
  const colors = useThemeColors();
  
  const [isRendered, setIsRendered] = useState(visible);
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 250 });
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
    }
  }, [visible]);

  const handleRequestClose = () => {
    if (visible) {
      onClose();
    }
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      } else {
        // add some resistance when dragging up
        translateY.value = event.translationY * 0.3;
      }
    })
    .onEnd((event) => {
      if (event.translationY > SCREEN_HEIGHT * 0.15 || event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.8 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value }
      ]
    };
  });

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark">
            <Pressable style={styles.overlay} onPress={onClose}>
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.contentContainer, contentStyle]}>
                  <Pressable onPress={(e) => e.stopPropagation()}>
                    {children}
                  </Pressable>
                </Animated.View>
              </GestureDetector>
            </Pressable>
          </BlurView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    // Basic structural styles, assuming children will provide their own
    // background, border radius, and padding.
  }
});
