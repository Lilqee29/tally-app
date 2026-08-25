// Tally Design System — Typography
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  // Widget / big display
  display: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text.primary,
  },
  // Screen headline ("Today", "Settings", "Heatmap")
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
  },
  // Row title
  rowTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Row title done (tertiary)
  rowTitleDone: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  // Timestamp / secondary
  timestamp: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  // Section header (uppercase, muted)
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Pill button label
  pillButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
