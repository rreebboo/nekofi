import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Pressable, Dimensions, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OriginCoordinate {
  x: number;
  y: number;
}

interface OriginDialogProps {
  visible: boolean;
  onClose: () => void;
  origin: OriginCoordinate | null;
  children: React.ReactNode;
}

export function OriginDialog({ visible, onClose, origin, children }: OriginDialogProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      progress.value = withSpring(1, { damping: 20, stiffness: 200, mass: 0.8 });
    } else if (isRendered) {
      progress.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
    }
  }, [visible]);

  const handleRequestClose = () => {
    if (visible) onClose();
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const contentStyle = useAnimatedStyle(() => {
    if (!origin) {
      return {
        transform: [
          { scale: interpolate(progress.value, [0, 1], [0.9, 1], Extrapolation.CLAMP) }
        ],
        opacity: progress.value
      };
    }

    // Origin transition targeting the center of the screen
    const targetX = 0; 
    const targetY = 0; 
    
    // The dialog naturally centers via flex. We calculate offset from center.
    const startX = origin.x - (SCREEN_WIDTH / 2);
    const startY = origin.y - (SCREEN_HEIGHT / 2);

    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [startX, targetX], Extrapolation.CLAMP) },
        { translateY: interpolate(progress.value, [0, 1], [startY, targetY], Extrapolation.CLAMP) },
        { scale: interpolate(progress.value, [0, 1], [0.1, 1], Extrapolation.CLAMP) }
      ],
      opacity: interpolate(progress.value, [0, 0.5, 1], [0, 1, 1], Extrapolation.CLAMP)
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
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark">
          <Pressable style={styles.overlay} onPress={onClose}>
            <Animated.View style={[styles.contentContainer, contentStyle]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                {children}
              </Pressable>
            </Animated.View>
          </Pressable>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentContainer: {
    width: '100%',
  }
});
