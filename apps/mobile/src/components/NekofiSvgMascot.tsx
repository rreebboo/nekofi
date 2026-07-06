import React, { useEffect } from 'react';
import Svg, { Path, Rect, G, Circle, Ellipse, Polygon } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import { useNekofiStore } from '../store/nekofiStore';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface NekofiSvgMascotProps {
  lookX: Animated.SharedValue<number>;
  lookY: Animated.SharedValue<number>;
  breatheScale: Animated.SharedValue<number>;
  breatheY: Animated.SharedValue<number>;
  isFocused: boolean;
}

export const NekofiSvgMascot: React.FC<NekofiSvgMascotProps> = React.memo(({ 
  lookX, 
  lookY, 
  breatheScale, 
  breatheY,
  isFocused
}) => {
  // Granular selector — only re-renders when `emotion` changes,
  // not on any other Zustand store update (e.g., message, state).
  const emotion = useNekofiStore((s) => s.emotion);
  
  const blinkScale = useSharedValue(1);
  const tailRotate = useSharedValue(0);

  // Blinking loop
  useEffect(() => {
    if (!isFocused) return;
    let timeoutId: NodeJS.Timeout;
    const blinkLoop = () => {
      blinkScale.value = withSequence(
        withTiming(0.05, { duration: 100 }), // close eyes
        withTiming(1, { duration: 100 })  // open eyes
      );
      timeoutId = setTimeout(blinkLoop, 2000 + Math.random() * 4000);
    };
    timeoutId = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(timeoutId);
  }, [isFocused]);

  // Tail wagging loop
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(tailRotate);
      return;
    }
    tailRotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [isFocused]);

  // Animate the eye radii directly to avoid transform origin bugs
  const greenEyeProps = useAnimatedProps(() => {
    const isSleeping = emotion === 'Sleepy' || emotion === 'Curl Up Sleep';
    return { ry: isSleeping ? 0.5 : blinkScale.value * 6 };
  });

  const pupilProps = useAnimatedProps(() => {
    const isSleeping = emotion === 'Sleepy' || emotion === 'Curl Up Sleep';
    return { ry: isSleeping ? 0 : blinkScale.value * 4 };
  });

  const highlightProps = useAnimatedProps(() => {
    const isSleeping = emotion === 'Sleepy' || emotion === 'Curl Up Sleep';
    return { ry: isSleeping ? 0 : blinkScale.value * 1.5 };
  });

  // Track the pupils with global touch coordinates
  const pupilTrackingProps = useAnimatedProps(() => {
    return {
      transform: [
        { translateX: lookX.value * 0.4 },
        { translateY: lookY.value * 0.4 }
      ]
    };
  });

  const tailProps = useAnimatedProps(() => ({
    rotation: tailRotate.value,
    originX: 44,
    originY: 46
  }));

  // Body breathing
  const bodyProps = useAnimatedProps(() => ({
    originY: 48,
    scaleY: breatheScale.value
  }));

  // Head bobbing and tracking
  const headProps = useAnimatedProps(() => ({
    transform: [
      { translateX: lookX.value },
      { translateY: lookY.value + breatheY.value }
    ]
  }));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
      
      {/* TAIL */}
      <AnimatedG animatedProps={tailProps}>
        {/* Exact curl matching the pixel art */}
        <Path 
          d="M 44 46 C 56 46, 58 36, 50 36 C 48 36, 46 38, 48 40" 
          fill="none" 
          stroke="#3b3b3b" 
          strokeWidth={5} 
          strokeLinecap="round" 
        />
      </AnimatedG>
      
      {/* BODY */}
      <AnimatedG animatedProps={bodyProps}>
        {/* Main Body */}
        <Rect x={18} y={34} width={28} height={22} rx={10} fill="#3b3b3b" />
        
        {/* Legs / Paws (front) */}
        <Rect x={21} y={50} width={8} height={8} rx={4} fill="#2a2a2a" />
        <Rect x={35} y={50} width={8} height={8} rx={4} fill="#2a2a2a" />
      </AnimatedG>
      
      {/* HEAD */}
      <AnimatedG animatedProps={headProps}>
        
        {/* Ears */}
        {/* Left Ear */}
        <Polygon points="16,22 18,6 28,18" fill="#3b3b3b" />
        <Polygon points="18,18 20,10 25,18" fill="#39FF14" />
        
        {/* Right Ear */}
        <Polygon points="48,22 46,6 36,18" fill="#3b3b3b" />
        <Polygon points="46,18 44,10 39,18" fill="#39FF14" />

        {/* Head Shape */}
        <Rect x={14} y={16} width={36} height={24} rx={10} fill="#3b3b3b" />
        
        {/* Eyes Group (No transform scaling here to avoid origin bugs) */}
        <G>
          {/* Left Eye */}
          <AnimatedEllipse cx={24} cy={26} rx={6} animatedProps={greenEyeProps} fill="#39FF14" />
          {/* Right Eye */}
          <AnimatedEllipse cx={40} cy={26} rx={6} animatedProps={greenEyeProps} fill="#39FF14" />
          
          {/* Pupils tracking container */}
          <AnimatedG animatedProps={pupilTrackingProps}>
            {/* Black Pupils */}
            <AnimatedEllipse cx={24} cy={26} rx={3} animatedProps={pupilProps} fill="#000" />
            <AnimatedEllipse cx={40} cy={26} rx={3} animatedProps={pupilProps} fill="#000" />
            
            {/* Eye Shine / Highlights */}
            <AnimatedEllipse cx={25} cy={24} rx={1.5} animatedProps={highlightProps} fill="#fff" />
            <AnimatedEllipse cx={41} cy={24} rx={1.5} animatedProps={highlightProps} fill="#fff" />
          </AnimatedG>
        </G>
        
        {/* Nose & Mouth */}
        <Circle cx={32} cy={34} r={1.5} fill="#FF69B4" />
        <Path d="M 32 35.5 Q 30 37.5 28 36" stroke="#1a1a1a" strokeWidth={1} fill="none" strokeLinecap="round" />
        <Path d="M 32 35.5 Q 34 37.5 36 36" stroke="#1a1a1a" strokeWidth={1} fill="none" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
});
