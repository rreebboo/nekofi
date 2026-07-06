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

  /**
   * Pan gesture in tracking-only mode:
   *   - onBegin fires once on first finger contact (gives us the tap position).
   *   - onChange fires as the finger moves (keeps tracking smooth).
   * Both callbacks are worklets — they run on the UI thread, never on JS.
   */
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)           // activate immediately on any touch
        .maxPointers(1)
        .onBegin((e) => {
          'worklet';
          tapX.value = e.absoluteX;
          tapY.value = e.absoluteY;
        })
        .onChange((e) => {
          'worklet';
          tapX.value = e.absoluteX;
          tapY.value = e.absoluteY;
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
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
