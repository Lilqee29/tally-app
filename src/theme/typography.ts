// Tally Design System — Typography & Font styling
import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

const baseFont = Platform.select({
  ios: {
    fontFamily: 'System',
  },
  android: {
    fontFamily: 'sans-serif',
  },
  default: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

export const typography = StyleSheet.create({
  // Widget / big display
  display: {
    ...baseFont,
    fontSize: 40,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  // Screen headline ("Today", "Settings", "Heatmap")
  headline: {
    ...baseFont,
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  // Row title
  rowTitle: {
    ...baseFont,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  // Row title done (tertiary)
  rowTitleDone: {
    ...baseFont,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  // Timestamp / secondary
  timestamp: {
    ...baseFont,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: -0.1,
  },
  // Section header (uppercase, muted)
  sectionHeader: {
    ...baseFont,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Pill button label
  pillButton: {
    ...baseFont,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
});
