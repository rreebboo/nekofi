import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes are based on a standard ~5" screen mobile device (e.g. iPhone 11 Pro)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale sizes linearly based on width. Good for widths.
 */
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scale sizes linearly based on height. Good for heights.
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

/**
 * Moderate scale. Good for fonts, paddings, margins.
 * Ensures that scaling on larger screens isn't absurdly huge.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Viewport Width Percentage
 */
export const wp = (percentage: number) => (width * percentage) / 100;

/**
 * Viewport Height Percentage
 */
export const hp = (percentage: number) => (height * percentage) / 100;

/**
 * Get scaled font size based on pixel ratio and standard scaling
 */
export const responsiveFontSize = (size: number) => {
  const newSize = moderateScale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
