/**
 * Nekofi Design Tokens — Light & Dark themes
 */

export const tintColorLight = '#A052E6';
export const tintColorDark = '#A052E6';

export const Colors = {
  light: {
    // Brand
    primary: '#A052E6',
    primaryLight: '#B87DF0',
    secondary: '#FFC72C',
    accent: '#6BFFDB',

    // Backgrounds
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#EBEBEB',
    cardYellow: '#FFD56B',
    cardPurple: '#A052E6',

    // Text
    text: '#121212',
    textMuted: '#6B6B80',
    textDim: '#A0A0B0',

    // Borders
    border: '#E0E0E0',
    borderAlt: '#EEEEEE',

    // Semantic
    success: '#34C759',
    warning: '#FFCC00',
    error: '#FF3B30',
    info: '#007AFF',

    // Finance-specific
    income: '#34C759',
    expense: '#FF3B30',
    transfer: '#007AFF',

    tint: tintColorLight,
    tabIconDefault: '#888888',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // Brand
    primary: '#A052E6',
    primaryLight: '#B87DF0',
    secondary: '#FFC72C',
    accent: '#6BFFDB',

    // Backgrounds
    background: '#000000',
    surface: '#121212',
    surfaceAlt: '#2A2A2A',
    cardYellow: '#FFD56B',
    cardPurple: '#A052E6',

    // Text
    text: '#FFFFFF',
    textMuted: '#A0A0B0',
    textDim: '#6B6B80',

    // Borders
    border: '#2A2A2A',
    borderAlt: '#1A1A1A',

    // Semantic
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#0A84FF',

    // Finance-specific
    income: '#30D158',
    expense: '#FF453A',
    transfer: '#0A84FF',

    tint: tintColorDark,
    tabIconDefault: '#6B6B80',
    tabIconSelected: tintColorDark,
  }
};

export type ThemeColors = typeof Colors.light;
export type ColorKey = keyof ThemeColors;
