/**
 * Nekofi Design Tokens — Dark theme by default.
 */
export const Colors = {
  // Brand
  primary: '#7C6BFF',
  primaryLight: '#A89DFF',
  secondary: '#FF6BDB',
  accent: '#6BFFDB',

  // Backgrounds
  background: '#0A0A1A',
  surface: '#141428',
  surfaceAlt: '#1C1C3A',

  // Text
  text: '#F0F0FF',
  textMuted: '#7878A4',
  textDim: '#4A4A6A',

  // Borders
  border: '#2A2A4A',

  // Semantic
  success: '#4AFFA4',
  warning: '#FFD166',
  error: '#FF6B6B',
  info: '#6BB5FF',

  // Finance-specific
  income: '#4AFFA4',
  expense: '#FF6B6B',
  transfer: '#6BB5FF',
} as const;

export type ColorKey = keyof typeof Colors;
