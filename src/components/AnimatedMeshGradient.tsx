import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  RoundedRect,
  Circle,
  Blur,
  LinearGradient,
  vec,
  rrect,
  rect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedMeshGradientProps {
  width: number;
  height: number;
  borderRadius?: number;
  /** Two-color base gradient [start, end] */
  baseColors: [string, string];
  /** Two blob accent colors */
  blobColors: [string, string];
  /** Full animation cycle in ms (default 6000) */
  duration?: number;
  /** Keep blob glow below this Y value (e.g. header height). Default 0 (no constraint). */
  topSafeZone?: number;
}

const BLUR_AMOUNT = 50;

/**
 * Adjust a blob's Y center/amplitude so its visible glow
 * (center − radius − blur) never goes above safeMinY.
 */
function constrainBlobY(
  origCenter: number,
  origAmp: number,
  blobRadius: number,
  safeZone: number | undefined,
): { center: number; amp: number } {
  if (!safeZone || safeZone <= 0) return { center: origCenter, amp: origAmp };

  // The visible top edge of a blob is center − amplitude − radius − blur.
  // We want that ≥ safeZone, so minCenter = safeZone + radius + blur.
  const safeMinCenter = safeZone + blobRadius + BLUR_AMOUNT;
  const origMin = origCenter - origAmp;
  const origMax = origCenter + origAmp;
  const newMin = Math.max(origMin, safeMinCenter);

  if (newMin >= origMax) {
    return { center: safeMinCenter, amp: 0 };
  }

  return {
    center: (newMin + origMax) / 2,
    amp: (origMax - newMin) / 2,
  };
}

export function AnimatedMeshGradient({
  width,
  height,
  borderRadius = 16,
  baseColors,
  blobColors,
  duration = 6000,
  topSafeZone,
}: AnimatedMeshGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  // Constrain blob Y ranges so their glow stays below topSafeZone
  const blob1R = width * 0.35;
  const blob2R = width * 0.3;
  const blob3R = width * 0.2;

  const b1 = constrainBlobY(height * 0.3, height * 0.4, blob1R, topSafeZone);
  const b2 = constrainBlobY(height * 0.7, height * 0.35, blob2R, topSafeZone);
  const b3 = constrainBlobY(height * 0.5, height * 0.3, blob3R, topSafeZone);

  // Blob 1: sweeps across the card in a wide elliptical path
  const blob1X = useDerivedValue(() => {
    return width * 0.2 + Math.sin(progress.value * Math.PI * 2) * width * 0.4;
  });
  const blob1Y = useDerivedValue(() => {
    return b1.center + Math.cos(progress.value * Math.PI * 2) * b1.amp;
  });

  // Blob 2: moves in an offset counter-path for organic feel
  const blob2X = useDerivedValue(() => {
    return width * 0.8 - Math.cos(progress.value * Math.PI * 2 + 1.5) * width * 0.35;
  });
  const blob2Y = useDerivedValue(() => {
    return b2.center - Math.sin(progress.value * Math.PI * 2 + 1.5) * b2.amp;
  });

  // Blob 3: smaller accent blob with a different phase
  const blob3X = useDerivedValue(() => {
    return width * 0.5 + Math.sin(progress.value * Math.PI * 2 + 3) * width * 0.3;
  });
  const blob3Y = useDerivedValue(() => {
    return b3.center + Math.cos(progress.value * Math.PI * 2 + 3) * b3.amp;
  });

  const clip = rrect(rect(0, 0, width, height), borderRadius, borderRadius);

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]}>
      <Group clip={clip}>
        {/* Base gradient fill */}
        <RoundedRect x={0} y={0} width={width} height={height} r={borderRadius}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={baseColors}
          />
        </RoundedRect>

        {/* Animated blobs — large, bright, blurred */}
        <Group>
          <Blur blur={50} />
          <Circle
            cx={blob1X}
            cy={blob1Y}
            r={width * 0.35}
            color={blobColors[0]}
            opacity={0.65}
          />
          <Circle
            cx={blob2X}
            cy={blob2Y}
            r={width * 0.3}
            color={blobColors[1]}
            opacity={0.55}
          />
          <Circle
            cx={blob3X}
            cy={blob3Y}
            r={width * 0.2}
            color={blobColors[0]}
            opacity={0.4}
          />
        </Group>
      </Group>
    </Canvas>
  );
}
