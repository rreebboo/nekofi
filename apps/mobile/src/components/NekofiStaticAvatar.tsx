import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, G, Circle, Ellipse, Polygon } from 'react-native-svg';

export interface NekofiStaticAvatarProps {
  size?: number;
}

export const NekofiStaticAvatar: React.FC<NekofiStaticAvatarProps> = React.memo(({ size = 100 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
        {/* TAIL */}
        <G rotation={0} origin="44, 46">
          <Path 
            d="M 44 46 C 56 46, 58 36, 50 36 C 48 36, 46 38, 48 40" 
            fill="none" 
            stroke="#3b3b3b" 
            strokeWidth={5} 
            strokeLinecap="round" 
          />
        </G>
        
        {/* BODY */}
        <G origin="0, 48" scaleY={1}>
          {/* Main Body */}
          <Rect x={18} y={34} width={28} height={22} rx={10} fill="#3b3b3b" />
          
          {/* Legs / Paws (front) */}
          <Rect x={21} y={50} width={8} height={8} rx={4} fill="#2a2a2a" />
          <Rect x={35} y={50} width={8} height={8} rx={4} fill="#2a2a2a" />
        </G>
        
        {/* HEAD */}
        <G transform="translate(0, 0)">
          {/* Ears */}
          <Polygon points="16,22 18,6 28,18" fill="#3b3b3b" />
          <Polygon points="18,18 20,10 25,18" fill="#39FF14" />
          
          <Polygon points="48,22 46,6 36,18" fill="#3b3b3b" />
          <Polygon points="46,18 44,10 39,18" fill="#39FF14" />

          {/* Head Shape */}
          <Rect x={14} y={16} width={36} height={24} rx={10} fill="#3b3b3b" />
          
          {/* Eyes Group */}
          <G>
            <Ellipse cx={24} cy={26} rx={6} ry={6} fill="#39FF14" />
            <Ellipse cx={40} cy={26} rx={6} ry={6} fill="#39FF14" />
            
            <G transform="translate(0, 0)">
              <Ellipse cx={24} cy={26} rx={3} ry={4} fill="#000" />
              <Ellipse cx={40} cy={26} rx={3} ry={4} fill="#000" />
              
              <Ellipse cx={25} cy={24} rx={1.5} ry={1.5} fill="#fff" />
              <Ellipse cx={41} cy={24} rx={1.5} ry={1.5} fill="#fff" />
            </G>
          </G>
          
          {/* Nose & Mouth */}
          <Circle cx={32} cy={34} r={1.5} fill="#FF69B4" />
          <Path d="M 32 35.5 Q 30 37.5 28 36" stroke="#1a1a1a" strokeWidth={1} fill="none" strokeLinecap="round" />
          <Path d="M 32 35.5 Q 34 37.5 36 36" stroke="#1a1a1a" strokeWidth={1} fill="none" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
});
