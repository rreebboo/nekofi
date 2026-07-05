import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useNekofiStore, NekofiEmotion } from '../store/nekofiStore';
import { useAuthStore } from '../stores/authStore';
import { NekofiSvgMascot } from './NekofiSvgMascot';
import { Colors } from '../constants/Colors';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  Easing,
  withRepeat
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

export const NekofiCompanion: React.FC = () => {
  const { state, emotion, message, triggerAnimation, triggerRandomIdle, lastTap } = useNekofiStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const scaleY = useSharedValue(1);
  const scaleX = useSharedValue(1);
  
  const breatheScale = useSharedValue(1);
  const breatheY = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const containerRef = React.useRef<View>(null);

  // Advanced Idle Loop
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    if (state === 'IDLE') {
      idleTimer = setInterval(() => {
        triggerRandomIdle();
      }, 5000 + Math.random() * 5000); // Random interval between 5-10s
    }
    return () => clearInterval(idleTimer);
  }, [state, triggerRandomIdle]);

  const { user } = useAuthStore();
  const hasGreeted = React.useRef(false);
  const hasInteracted = React.useRef(false);

  // Initial Greeting (waits for user to load)
  useEffect(() => {
    if (!user || hasGreeted.current) return;
    hasGreeted.current = true;

    const h = new Date().getHours();
    let greeting = 'Good evening';
    if (h < 12) greeting = 'Good morning';
    else if (h < 18) greeting = 'Good afternoon';

    // Try to get first name
    const firstName = user?.name?.split(' ')[0] 
      || user?.email?.split('@')[0] 
      || 'there';

    // Duration 0 means it waits for user interaction
    triggerAnimation('Wave Hello', `${greeting}, ${firstName}! Ready to save today?`, 0);
  }, [user]);

  // Continuous breathing and bobbing
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

  // Eye tracking / Head tracking and first interaction
  useEffect(() => {
    if (lastTap) {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        // Transition to the tracking speech when they first tap/scroll
        triggerAnimation('Curious', "I'm tracking your every move... I mean, your finances!", 0);
      }

      if (containerRef.current) {
        containerRef.current.measure((x, y, width, height, pageX, pageY) => {
          const centerX = pageX + width / 2;
          const centerY = pageY + height / 2;
          const dx = lastTap.x - centerX;
          const dy = lastTap.y - centerY;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxMove = 6; // Max pixels to pivot
          
          if (distance > 0) {
            lookX.value = withTiming((dx / distance) * maxMove, { duration: 400, easing: Easing.out(Easing.quad) });
            lookY.value = withTiming((dy / distance) * maxMove, { duration: 400, easing: Easing.out(Easing.quad) });
          }
        });
      }
    } else {
      lookX.value = withTiming(0);
      lookY.value = withTiming(0);
    }
  }, [lastTap]);

  const handlePress = () => {
    // Squash and stretch animation
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
  };

  const animConfig = EMOTION_MAP[emotion] || { row: 0, frames: 4 };

  const displayedText = message || "I'm keeping an eye on your finances!";
  const [typedText, setTypedText] = React.useState('');
  const bubbleScale = useSharedValue(1);

  // Pop animation and typewriter effect whenever text changes
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
    }, 30); // 30ms per character gives a smooth, fast typing feel

    return () => clearInterval(interval);
  }, [displayedText]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: -25,
    top: -30,
    zIndex: 100,
    transform: [
      { scaleX: scaleX.value }, 
      { scaleY: scaleY.value }
    ],
  }));

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <View style={styles.container} ref={containerRef}>
      <Animated.View style={animatedContainerStyle}>
        <Pressable onPress={handlePress} style={styles.mascotWrapper}>
           <NekofiSvgMascot 
             lookX={lookX} 
             lookY={lookY} 
             breatheScale={breatheScale} 
             breatheY={breatheY} 
           />
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }, animatedBubbleStyle]}>
        <View style={[styles.bubbleTail, { backgroundColor: colors.surface, borderLeftColor: colors.border, borderBottomColor: colors.border }]} />
        <Text style={[styles.speechText, { color: colors.text }]}>
          {typedText}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 100,
  },
  mascotWrapper: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    marginLeft: 140,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1, // Shrink to fit text naturally without stretching full width
    alignSelf: 'center', // Center vertically alongside the mascot
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
