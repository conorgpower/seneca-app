/**
 * Dark theme color palette inspired by Bible Chat
 */

export const colors = {
  // Background
  background: '#1C1B1E',
  backgroundSecondary: '#2C2B2E',
  backgroundCard: '#3A3840',
  
  // Primary
  primary: '#D4A574', // Gold/bronze accent
  primaryDark: '#B8935E',
  primaryLight: '#E8C9A0',
  
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
  tabBarActive: '#D4A574',
  tabBarInactive: '#707070',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
};

export type Colors = typeof colors;
