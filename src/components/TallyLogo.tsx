import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface TallyLogoProps {
  size?: number;
  color?: string;
}

/**
 * Tally mark wordmark: ||||̶  — four vertical strokes with one diagonal strike-through.
 * Drawn as an SVG, sized to match the top bar.
 */
export function TallyLogo({ size = 36, color = colors.text.primary }: TallyLogoProps) {
  const strokeWidth = size * 0.1;
  const height = size;
  // 4 vertical bars + 1 diagonal crossing all 4
  // Total width: 4 bars + 3 gaps
  const barSpacing = size * 0.28;
  const totalWidth = barSpacing * 4;

  const bars = [0, 1, 2, 3];

  return (
    <Svg
      width={totalWidth + strokeWidth}
      height={height}
      viewBox={`0 0 ${totalWidth + strokeWidth} ${height}`}
    >
      {/* 4 vertical tally bars */}
      {bars.map((i) => (
        <Line
          key={i}
          x1={strokeWidth / 2 + i * barSpacing}
          y1={height * 0.08}
          x2={strokeWidth / 2 + i * barSpacing}
          y2={height * 0.92}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {/* Diagonal strike-through (5th tally mark) */}
      <Line
        x1={strokeWidth / 2 - size * 0.08}
        y1={height * 0.85}
        x2={totalWidth + strokeWidth / 2 + size * 0.08}
        y2={height * 0.15}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
