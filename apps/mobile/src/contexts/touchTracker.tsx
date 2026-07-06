/**
 * touchTracker.tsx
 *
 * Provides tap/touch coordinates as Reanimated SharedValues so that eye-
 * tracking in NekofiCompanion can run entirely on the UI thread with zero
 * React re-renders on every tap.
 *
 * Usage:
 *   // Provider (wrap at root, inside GestureHandlerRootView)
 *   <TouchTrackerProvider>...</TouchTrackerProvider>
 *
 *   // Consumer
 *   const { tapX, tapY } = useTouchTracker();
 */
import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';

interface TouchTrackerContextValue {
  /** Raw page-X coordinate of the last touch. Runs on UI thread only. */
  tapX: Animated.SharedValue<number>;
  /** Raw page-Y coordinate of the last touch. Runs on UI thread only. */
  tapY: Animated.SharedValue<number>;
}

const TouchTrackerContext = createContext<TouchTrackerContextValue | null>(null);

export const TouchTrackerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const tapX = useSharedValue(0);
  const tapY = useSharedValue(0);

  const gesture = useMemo(
    () =>
      Gesture.Manual()
        .onTouchesDown((e) => {
          'worklet';
          if (e.allTouches.length > 0) {
            tapX.value = e.allTouches[0].absoluteX;
            tapY.value = e.allTouches[0].absoluteY;
          }
        })
        .onTouchesMove((e) => {
          'worklet';
          if (e.allTouches.length > 0) {
            tapX.value = e.allTouches[0].absoluteX;
            tapY.value = e.allTouches[0].absoluteY;
          }
        }),
    // SharedValues are stable refs; no dependencies needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const value = useMemo(() => ({ tapX, tapY }), [tapX, tapY]);

  return (
    <TouchTrackerContext.Provider value={value}>
      <GestureDetector gesture={gesture}>
        {/* Animated.View fills its parent so it captures touches app-wide.
            pointerEvents="box-none" means the overlay itself doesn't consume
            touches — child elements still receive their events normally. */}
        <Animated.View style={{ flex: 1 }} pointerEvents="box-none">
          {children}
        </Animated.View>
      </GestureDetector>
    </TouchTrackerContext.Provider>
  );
};

/**
 * Returns the shared tap coordinate values.
 * Components that consume this hook do NOT re-render on touch — they
 * read the values only inside Reanimated worklets (useAnimatedReaction,
 * useAnimatedStyle, useAnimatedProps).
 */
export function useTouchTracker(): TouchTrackerContextValue {
  const ctx = useContext(TouchTrackerContext);
  if (!ctx) {
    throw new Error('useTouchTracker must be used inside TouchTrackerProvider');
  }
  return ctx;
}
