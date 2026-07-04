import React, { createContext, useContext } from 'react';
import { useSharedValue, SharedValue, useAnimatedScrollHandler, withSpring, useScrollViewOffset, useAnimatedReaction, useAnimatedRef } from 'react-native-reanimated';

interface FabContextType {
  fabVisible: SharedValue<number>;
}

export const FabContext = createContext<FabContextType | null>(null);

export function FabProvider({ children }: { children: React.ReactNode }) {
  // 1 = visible, 0 = hidden
  const fabVisible = useSharedValue(1);

  return (
    <FabContext.Provider value={{ fabVisible }}>
      {children}
    </FabContext.Provider>
  );
}

export function useFab() {
  const ctx = useContext(FabContext);
  if (!ctx) {
    throw new Error('useFab must be used within a FabProvider');
  }
  return ctx;
}

export function useFabScroll() {
  const { fabVisible } = useFab();
  const lastScrollY = useSharedValue(0);
  const accumulatedY = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const dy = currentY - lastScrollY.value;
      
      // Accumulate scroll direction
      if (Math.sign(dy) !== Math.sign(accumulatedY.value)) {
        accumulatedY.value = 0;
      }
      accumulatedY.value += dy;
      lastScrollY.value = currentY;

      if (currentY <= 0) {
        if (fabVisible.value !== 1) fabVisible.value = withSpring(1, { damping: 14, stiffness: 150 });
      } else if (accumulatedY.value > 20 && currentY > 50) {
        // Scrolling down
        if (fabVisible.value !== 0) fabVisible.value = withSpring(0, { damping: 14, stiffness: 150 });
        accumulatedY.value = 0;
      } else if (accumulatedY.value < -20) {
        // Scrolling up
        if (fabVisible.value !== 1) fabVisible.value = withSpring(1, { damping: 14, stiffness: 150 });
        accumulatedY.value = 0;
      }
    }
  });
}

export function useFabScrollOffset(scrollRef: any) {
  const { fabVisible } = useFab();
  const accumulatedY = useSharedValue(0);

  const scrollOffset = useScrollViewOffset(scrollRef);

  useAnimatedReaction(
    () => scrollOffset.value,
    (currentY, previousY) => {
      if (currentY === null || previousY === null) return;
      const dy = currentY - previousY;
      
      if (Math.sign(dy) !== Math.sign(accumulatedY.value)) {
        accumulatedY.value = 0;
      }
      accumulatedY.value += dy;

      if (currentY <= 0) {
        if (fabVisible.value !== 1) fabVisible.value = withSpring(1, { damping: 14, stiffness: 150 });
      } else if (accumulatedY.value > 20 && currentY > 50) {
        // Scrolling down
        if (fabVisible.value !== 0) fabVisible.value = withSpring(0, { damping: 14, stiffness: 150 });
        accumulatedY.value = 0;
      } else if (accumulatedY.value < -20) {
        // Scrolling up
        if (fabVisible.value !== 1) fabVisible.value = withSpring(1, { damping: 14, stiffness: 150 });
        accumulatedY.value = 0;
      }
    }
  );
}
