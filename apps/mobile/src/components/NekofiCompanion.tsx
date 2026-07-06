import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, LayoutChangeEvent } from 'react-native';
import { useNekofiStore, NekofiEmotion } from '../store/nekofiStore';
import { useAuthStore } from '../stores/authStore';
import { useAIStore } from '../store/useAIStore';
import { NekofiSvgMascot } from './NekofiSvgMascot';
import { Colors } from '../constants/Colors';
import { useTouchTracker } from '../contexts/touchTracker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withSequence,
  withTiming,
  Easing,
  withRepeat,
} from 'react-native-reanimated';

// Placeholder mapping for all 34 states until the actual sprite sheet is provided.
const EMOTION_MAP: Record<NekofiEmotion, { row: number, frames: number }> = {
  // Expressions (15)
  'Happy': { row: 0, frames: 6 },
  'Excited': { row: 1, frames: 8 },
  'Proud': { row: 2, frames: 6 },
  'Curious': { row: 3, frames: 6 },
  'Thinking': { row: 4, frames: 8 },
  'Concerned': { row: 5, frames: 6 },
  'Encouraging': { row: 6, frames: 6 },
  'Love': { row: 7, frames: 6 },
  'Surprised': { row: 8, frames: 6 },
  'Shocked': { row: 9, frames: 6 },
  'Sad': { row: 10, frames: 6 },
  'Sleepy': { row: 11, frames: 6 },
  'Winking': { row: 12, frames: 6 },
  'Laughing': { row: 13, frames: 8 },
  'Embarrassed': { row: 14, frames: 6 },

  // Idle Animations (10)
  'Blinking': { row: 15, frames: 6 },
  'Tail Sway': { row: 16, frames: 8 },
  'Looking Around': { row: 17, frames: 10 },
  'Breathing': { row: 18, frames: 6 },
  'Head Tilt': { row: 19, frames: 6 },
  'Stretch': { row: 20, frames: 8 },
  'Clean Paws': { row: 21, frames: 8 },
  'Yawn': { row: 22, frames: 8 },
  'Curl Up Sleep': { row: 23, frames: 10 },
  'Roll Over': { row: 24, frames: 8 },

  // Interactions & Reactions (9)
  'Wave Hello': { row: 25, frames: 8 },
  'Add Income': { row: 26, frames: 8 },
  'Add Expense': { row: 27, frames: 8 },
  'Goal Reached': { row: 28, frames: 10 },
  'Overspending': { row: 29, frames: 8 },
  'Encouraging You': { row: 30, frames: 8 },
  'AI Thinking': { row: 31, frames: 8 },
  'Listening': { row: 32, frames: 6 },
  'Celebration': { row: 33, frames: 12 },
};

export interface NekofiCompanionProps {
  hideBubble?: boolean;
  size?: number;
  inline?: boolean;
}

export const NekofiCompanion: React.FC<NekofiCompanionProps> = React.memo(({
  hideBubble = false,
  size = 180,
  inline = false
}) => {
  // ─── Granular Zustand selectors ───────────────────────────────────────────
  // Each selector is independent — this component only re-renders when the
  // specific slice it needs actually changes. Previously `useNekofiStore()`
  // (no selector) caused a re-render on every single touch.
  const nekoState = useNekofiStore((s) => s.state);
  const emotion = useNekofiStore((s) => s.emotion);
  const message = useNekofiStore((s) => s.message);
  const triggerAnimation = useNekofiStore((s) => s.triggerAnimation);
  const triggerRandomIdle = useNekofiStore((s) => s.triggerRandomIdle);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // ─── Reanimated shared values ─────────────────────────────────────────────
  const scaleY = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const breatheScale = useSharedValue(1);
  const breatheY = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);

  // ─── Touch tracker (UI-thread SharedValues, zero re-renders) ─────────────
  const { tapX, tapY } = useTouchTracker();

  // ─── Cached layout (avoids measure() on every tap) ───────────────────────
  // The companion's bounding box is stored as Reanimated SharedValues so that
  // worklets on the UI thread can read them without crossing the JS bridge.
  const containerRef = React.useRef<View>(null);
  const layoutPageX = useSharedValue(0);
  const layoutPageY = useSharedValue(0);
  const layoutWidth = useSharedValue(0);
  const layoutHeight = useSharedValue(0);

  // Sync layout SharedValues when layout changes (only fires on actual layout events,
  // not on every tap — measure() is called once per layout change)
  const handleLayoutSync = useCallback((_e: LayoutChangeEvent) => {
    requestAnimationFrame(() => {
      containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        layoutPageX.value = pageX;
        layoutPageY.value = pageY;
        layoutWidth.value = width;
        layoutHeight.value = height;
      });
    });
  }, [layoutPageX, layoutPageY, layoutWidth, layoutHeight]);

  useAnimatedReaction(
    () => ({ x: tapX.value, y: tapY.value }),
    (current) => {
      'worklet';
      const centerX = layoutPageX.value + layoutWidth.value / 2;
      const centerY = layoutPageY.value + layoutHeight.value / 2;
      const dx = current.x - centerX;
      const dy = current.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxMove = 6; // max pixel pivot

      if (distance > 0) {
        lookX.value = withTiming((dx / distance) * maxMove, {
          duration: 400,
          easing: Easing.out(Easing.quad),
        });
        lookY.value = withTiming((dy / distance) * maxMove, {
          duration: 400,
          easing: Easing.out(Easing.quad),
        });
      }
    }
  );

  // ─── Interaction tracking (first-tap greeting) ────────────────────────────
  // We still need to know *if* the user has tapped to show a message,
  // but we only need a one-time JS notification, not per-tap updates.
  // useAnimatedReaction fires the JS callback only once via runOnJS.
  const hasInteracted = React.useRef(false);

  const notifyFirstInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      triggerAnimation('Curious', "I'm tracking your every move... I mean, your finances!", 0);
    }
  }, [triggerAnimation]);

  useAnimatedReaction(
    () => tapX.value + tapY.value, // any non-zero value means a tap happened
    (current, previous) => {
      'worklet';
      // Only the very first time a non-zero coordinate is received
      if (current !== 0 && previous === 0) {
        runOnJS(notifyFirstInteraction)();
      }
    }
  );

  // ─── Advanced Idle Loop ───────────────────────────────────────────────────
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    if (nekoState === 'IDLE') {
      idleTimer = setInterval(() => {
        triggerRandomIdle();
      }, 5000 + Math.random() * 5000);
    }
    return () => clearInterval(idleTimer);
  }, [nekoState, triggerRandomIdle]);

  // ─── Auth & AI stores (granular selectors) ────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const latestInsight = useAIStore((s) => s.latestInsight);
  const aiReady = useAIStore((s) => s.isReady);

  const hasGreeted = React.useRef(false);
  const hasShownInsight = React.useRef(false);

  // Initial greeting (fires once after user loads)
  useEffect(() => {
    if (!user || hasGreeted.current) return;
    hasGreeted.current = true;

    const h = new Date().getHours();
    let greeting = 'Good evening';
    if (h < 12) greeting = 'Good morning';
    else if (h < 18) greeting = 'Good afternoon';

    const firstName = user?.name?.split(' ')[0]
      || user?.email?.split('@')[0]
      || 'there';

    triggerAnimation('Wave Hello', `${greeting}, ${firstName}! Ready to save today?`, 0);
  }, [user]);

  // Show AI-powered contextual insight after initial greeting
  useEffect(() => {
    if (!aiReady || !latestInsight || hasShownInsight.current || !hasGreeted.current) return;
    hasShownInsight.current = true;

    const timer = setTimeout(() => {
      const { state: currentState } = useNekofiStore.getState();
      if (currentState === 'IDLE' || !hasInteracted.current) {
        triggerAnimation('Curious', latestInsight, 0);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [aiReady, latestInsight]);

  // ─── Continuous breathing and bobbing ────────────────────────────────────
  useEffect(() => {
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // ─── Press handler ───────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    scaleY.value = withSequence(
      withTiming(0.8, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1.1, { duration: 150, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.in(Easing.quad) })
    );
    scaleX.value = withSequence(
      withTiming(1.2, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(0.9, { duration: 150, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.in(Easing.quad) })
    );
    triggerAnimation('Excited', 'Purr-fect!', 3000);
  }, [triggerAnimation, scaleX, scaleY]);

  // ─── Typewriter effect ───────────────────────────────────────────────────
  const displayedText = message || "I'm keeping an eye on your finances!";
  const [typedText, setTypedText] = React.useState('');
  const bubbleScale = useSharedValue(1);

  useEffect(() => {
    setTypedText('');
    let currentIndex = 0;

    bubbleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1.02, { duration: 150, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.in(Easing.quad) })
    );

    const interval = setInterval(() => {
      if (currentIndex <= displayedText.length) {
        setTypedText(displayedText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [displayedText]);

  // ─── Animated styles ─────────────────────────────────────────────────────
  const animatedContainerStyle = useAnimatedStyle(() => ({
    position: inline ? 'relative' : 'absolute',
    left: inline ? 0 : -25,
    top: inline ? 0 : -30,
    zIndex: 100,
    transform: [
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <View
      style={[styles.container, !inline && { minHeight: 100 }]}
      ref={containerRef}
      onLayout={handleLayoutSync}
    >
      <Animated.View style={animatedContainerStyle}>
        <Pressable onPress={handlePress} style={[styles.mascotWrapper, { width: size, height: size }]}>
           <NekofiSvgMascot
             lookX={lookX}
             lookY={lookY}
             breatheScale={breatheScale}
             breatheY={breatheY}
           />
        </Pressable>
      </Animated.View>

      {!hideBubble && (
        <Animated.View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: size * 0.8 }, animatedBubbleStyle]}>
          <View style={[styles.bubbleTail, { backgroundColor: colors.surface, borderLeftColor: colors.border, borderBottomColor: colors.border }]} />
          <Text style={[styles.speechText, { color: colors.text }]}>
            {typedText}
          </Text>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mascotWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
  bubbleTail: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
    borderTopRightRadius: 2,
  },
  speechText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
