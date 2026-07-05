/**
 * Nekofi Design Tokens — Light & Dark themes
 */

export const tintColorLight = '#7DA82F'; // Matte Yellow-Green
export const tintColorDark = '#91C435';  // Flat Yellow-Green for dark mode

export const Colors = {
  light: {
    // Brand
    primary: '#7DA82F',     // Matte Yellow-Green
    primaryLight: '#A3D14D',
    secondary: '#D4AC28',   // Solid Gold
    accent: '#207AAB',      // Flat Blue

    // Backgrounds
    background: '#F8F9FA',  // Clean crisp light gray
    surface: '#FFFFFF',
    surfaceAlt: '#F1F3F5',
    cardSecondary: '#D4AC28',
    cardPrimary: '#7DA82F',

    // Text
    text: '#111827',        // Crisp dark text
    textMuted: '#6B7280',
    textDim: '#9CA3AF',

    // Borders
    border: '#E5E7EB',
    borderAlt: '#F3F4F6',

    // Semantic
    success: '#20A175',
    warning: '#D68C1C',
    error: '#D94141',
    info: '#2E77D6',

    // Finance-specific
    income: '#20A175',
    expense: '#D94141',

    // Nekofi
    nekofiGreen: '#CCFF00',
    nekofiPink: '#FF6B8A',

    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // Brand
    primary: '#91C435',     // Matte Yellow-Green
    primaryLight: '#B9E864',
    secondary: '#D4AC28',
    accent: '#2B9BCC',

    // Backgrounds
    background: '#1A1A1A',  // Nekofi Dark
    surface: '#2E2E2E',     // Nekofi Surface
    surfaceAlt: '#242830',
    cardSecondary: '#B89218',
    cardPrimary: '#91C435',

    // Text
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    textDim: '#6B7280',

    // Borders
    border: '#374151',
    borderAlt: '#1F2937',

    // Semantic
    success: '#2CB888',
    warning: '#E8A32A',
    error: '#E85A5A',
    info: '#4F94EB',

    // Finance-specific
    income: '#2CB888',
    expense: '#E85A5A',

    // Nekofi
    nekofiGreen: '#CCFF00',
    nekofiPink: '#FF6B8A',

    tint: tintColorDark,
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
  }
};

export type ThemeColors = typeof Colors.light;
export type ColorKey = keyof ThemeColors;
