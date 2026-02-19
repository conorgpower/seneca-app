/**
 * Typography system
 */

export const typography = {
  // Font families
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    serif: 'Georgia', // For quotes
  },
  
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export type Typography = typeof typography;
