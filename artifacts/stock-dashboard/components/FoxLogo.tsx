import React from "react";
import Svg, { Circle, Ellipse, Path, G, Defs, LinearGradient, Stop } from "react-native-svg";

interface Props {
  size?: number;
}

export default function FoxLogo({ size = 96 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E2EAF7" />
        </LinearGradient>
        <LinearGradient id="cheekGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD0DA" />
          <Stop offset="1" stopColor="#FFB6C8" />
        </LinearGradient>
        <LinearGradient id="tailGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D4DFEF" />
        </LinearGradient>
      </Defs>

      <Path
        d="M 158 138 Q 188 128 184 96 Q 180 72 162 78 Q 168 100 158 138 Z"
        fill="url(#tailGrad)"
        stroke="#A8B7CC"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M 168 86 Q 175 90 174 98" stroke="#A8B7CC" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      <Ellipse cx="100" cy="180" rx="55" ry="5" fill="#000" opacity="0.10" />

      <G>
        <Path
          d="M 38 78 Q 30 30 58 28 Q 78 32 84 70 Q 60 70 38 78 Z"
          fill="url(#bodyGrad)"
          stroke="#A8B7CC"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <Path
          d="M 52 60 Q 50 40 62 40 Q 70 42 72 62 Q 60 60 52 60 Z"
          fill="url(#cheekGrad)"
          opacity="0.85"
        />

        <Path
          d="M 162 78 Q 170 30 142 28 Q 122 32 116 70 Q 140 70 162 78 Z"
          fill="url(#bodyGrad)"
          stroke="#A8B7CC"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <Path
          d="M 148 60 Q 150 40 138 40 Q 130 42 128 62 Q 140 60 148 60 Z"
          fill="url(#cheekGrad)"
          opacity="0.85"
        />
      </G>

      <Ellipse
        cx="100"
        cy="118"
        rx="64"
        ry="56"
        fill="url(#bodyGrad)"
        stroke="#A8B7CC"
        strokeWidth="2.5"
      />

      <Path
        d="M 80 138 Q 100 158 120 138 Q 110 152 100 152 Q 90 152 80 138 Z"
        fill="url(#bodyGrad)"
        stroke="#A8B7CC"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <Ellipse cx="60" cy="130" rx="13" ry="8" fill="url(#cheekGrad)" opacity="0.85" />
      <Ellipse cx="140" cy="130" rx="13" ry="8" fill="url(#cheekGrad)" opacity="0.85" />

      <G>
        <Ellipse cx="78" cy="108" rx="6.5" ry="7.5" fill="#2C3A4D" />
        <Circle cx="76" cy="105" r="2.4" fill="#FFFFFF" />
        <Ellipse cx="122" cy="108" rx="6.5" ry="7.5" fill="#2C3A4D" />
        <Circle cx="120" cy="105" r="2.4" fill="#FFFFFF" />
      </G>

      <Path
        d="M 94 132 Q 100 138 106 132 Q 100 142 94 132 Z"
        fill="#2C3A4D"
        stroke="#2C3A4D"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      <Path
        d="M 100 142 Q 95 149 88 146"
        stroke="#2C3A4D"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 100 142 Q 105 149 112 146"
        stroke="#2C3A4D"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      <Ellipse cx="100" cy="78" rx="5" ry="2.5" fill="#FFD0DA" opacity="0.55" />
    </Svg>
  );
}
