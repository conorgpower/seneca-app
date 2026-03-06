import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { AnimatedMeshGradient } from './AnimatedMeshGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const { height: FULL_HEIGHT } = Dimensions.get('screen');

// Keep blob glow below the navigation header area (~100 pt).
const HEADER_SAFE_ZONE = 100;

interface AppBackgroundProps {
  children: React.ReactNode;
  /** Override the default header safe zone (e.g. for screens with extra chrome). */
  topSafeZone?: number;
}

/**
 * Subtle animated dark background used across the app.
 * Replaces plain #1C1B1E with slow-drifting warm-toned blobs.
 */
export function AppBackground({ children, topSafeZone = HEADER_SAFE_ZONE }: AppBackgroundProps) {
  return (
    <View style={styles.container}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={FULL_HEIGHT}
        borderRadius={0}
        baseColors={['#1C1B1E', '#1C1B1E']}
        blobColors={['#2E2A25', '#332D2D']}
        duration={14000}
        topSafeZone={topSafeZone}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1B1E',
  },
});
