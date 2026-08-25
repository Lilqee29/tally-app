// Tally Design System — Color tokens
export const colors = {
  // Backgrounds
  bg: {
    page: '#000000',           // pure black
    surface: '#1C1C1E',        // rows, sheets, widget card
    surfaceElevated: '#2C2C2E', // nested settings rows
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',      // timestamps, muted labels
    tertiary: '#636366',       // completed/strikethrough text
  },

  // States
  state: {
    done: '#34C759',           // green checkmark
    yes: '#0A84FF',            // widget YES (iOS system blue dark)
    no: '#FF3B30',             // widget NO / delete
  },

  // Accent
  accent: {
    streakStart: '#FF9500',
    streakMid: '#FF2D78',
    streakEnd: '#AF52DE',
  },

  // Controls
  border: {
    hairline: '#2C2C2E',       // 0.5px row dividers
  },
  control: {
    neutral: '#E5E5EA',        // FAB add button
  },

  // Dot color options for heatmap (user picks per question)
  dotColors: [
    '#0A84FF', // blue (default)
    '#34C759', // green
    '#FF9500', // orange
    '#FF2D78', // pink
    '#AF52DE', // purple
    '#FF3B30', // red
    '#30D158', // mint
    '#64D2FF', // cyan
  ],
} as const;
