/**
 * Dark theme color palette inspired by Bible Chat
 */

export const colors = {
  // Background
  background: '#1C1B1E',
  backgroundSecondary: '#2C2B2E',
  backgroundCard: '#3A3840',
  
  // Primary
  primary: '#DEAD5C',
  primaryDark: '#C89A4A',
  primaryLight: '#F2DFC0',

  // Secondary & Tertiary
  secondary: '#454449',
  tertiary: '#F2DFC0',
  quaternary: '#D9C9A8',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  
  // Borders
  border: '#404040',
  borderLight: '#505050',
  
  // Accent
  accent: '#8B7355', // Muted brown
  accentSecondary: '#5A4A3A',
  
  // Status
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#EF5350',
  
  // Tab bar
  tabBarActive: '#DEAD5C',
  tabBarInactive: '#707070',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
};

export type Colors = typeof colors;
