import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
// Full width item so it snaps perfectly
export const CAROUSEL_ITEM_WIDTH = width - 40;
const SPACING = 16;
export const SNAP_INTERVAL = CAROUSEL_ITEM_WIDTH + SPACING;

interface HomeCarouselProps {
  children: React.ReactNode;
}

interface CarouselItemProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  children: React.ReactNode;
}

function CarouselItem({ index, scrollX, children }: CarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      'clamp'
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      'clamp'
    );
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width: CAROUSEL_ITEM_WIDTH, marginRight: SPACING }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export function HomeCarousel({ children }: HomeCarouselProps) {
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      contentContainerStyle={styles.container}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      {React.Children.map(children, (child, index) => {
        return (
          <CarouselItem key={index} index={index} scrollX={scrollX}>
            {child}
          </CarouselItem>
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: 20,
    paddingRight: 20 - SPACING,
    paddingVertical: 16, // Extra padding for scale up/down shadow bounds
  },
});
