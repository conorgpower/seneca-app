import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { theme } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Gradient colors from inner to outer ring
const RING_COLORS = ['#5BBFAD', '#52B3BF', '#6BA3D4', '#8B96E0'];
const CENTER_COLOR = RING_COLORS[0];

// Each ring: radius range, stroke, opacity, wave params.
// Fewer waves (3) + gentle amplitudes = calm, organic feel.
const RING_CONFIG = [
  { baseRadius: 60, maxRadius: 88, strokeWidth: 9, baseOpacity: 0.8, maxOpacity: 1.0, waveAmp: 5, numWaves: 3, phaseOffset: 0, color: RING_COLORS[0] },
  { baseRadius: 76, maxRadius: 110, strokeWidth: 7, baseOpacity: 0.45, maxOpacity: 0.65, waveAmp: 7, numWaves: 3, phaseOffset: 1.5, color: RING_COLORS[1] },
  { baseRadius: 92, maxRadius: 132, strokeWidth: 5, baseOpacity: 0.22, maxOpacity: 0.4, waveAmp: 9, numWaves: 3, phaseOffset: 3.0, color: RING_COLORS[2] },
  { baseRadius: 108, maxRadius: 154, strokeWidth: 4, baseOpacity: 0.1, maxOpacity: 0.22, waveAmp: 11, numWaves: 3, phaseOffset: 4.5, color: RING_COLORS[3] },
];

const NUM_POINTS = 72;
const SVG_SIZE = 340;
const CENTER = SVG_SIZE / 2;

type Props = {
  expansionProgress: SharedValue<number>;
  phaseLabel: string;
  phaseCountdown?: number | null;
  isHolding?: boolean;
};

function WavyRing({
  config,
  expansionProgress,
  wavePhase,
}: {
  config: (typeof RING_CONFIG)[number];
  expansionProgress: SharedValue<number>;
  wavePhase: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const radius = interpolate(
      expansionProgress.value,
      [0, 1],
      [config.baseRadius, config.maxRadius],
    );
    const opacity = interpolate(
      expansionProgress.value,
      [0, 1],
      [config.baseOpacity, config.maxOpacity],
    );

    // Waves only during inhale/exhale — smooth circles at both contracted (0) and expanded (1)
    // Peaks at mid-expansion (0.5), zero at both ends
    const waveFactor = 1 - Math.abs(2 * expansionProgress.value - 1);
    const amp = config.waveAmp * waveFactor;
    const phase = wavePhase.value + config.phaseOffset;

    // Build wavy circle path
    let d = '';
    for (let i = 0; i <= NUM_POINTS; i++) {
      const angle = (i / NUM_POINTS) * 2 * Math.PI;
      const wave = amp * Math.sin(config.numWaves * angle + phase);
      const r = radius + wave;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    d += 'Z';

    return { d, opacity };
  });

  return (
    <AnimatedPath
      fill="none"
      stroke={config.color}
      strokeWidth={config.strokeWidth}
      strokeLinejoin="round"
      animatedProps={animatedProps}
    />
  );
}

// Filled band between two adjacent wavy rings — follows the wave contour
const BAND_CONFIG = [
  { outer: RING_CONFIG[1], inner: RING_CONFIG[0], color: RING_COLORS[1], fillOpacity: 0.18 },
  { outer: RING_CONFIG[2], inner: RING_CONFIG[1], color: RING_COLORS[2], fillOpacity: 0.15 },
  { outer: RING_CONFIG[3], inner: RING_CONFIG[2], color: RING_COLORS[3], fillOpacity: 0.12 },
];

function WavyBand({
  band,
  expansionProgress,
  wavePhase,
}: {
  band: (typeof BAND_CONFIG)[number];
  expansionProgress: SharedValue<number>;
  wavePhase: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const exp = expansionProgress.value;
    const waveFactor = 1 - Math.abs(2 * exp - 1);

    const outerRadius = interpolate(exp, [0, 1], [band.outer.baseRadius, band.outer.maxRadius]);
    const outerAmp = band.outer.waveAmp * waveFactor;
    const outerPhase = wavePhase.value + band.outer.phaseOffset;

    const innerRadius = interpolate(exp, [0, 1], [band.inner.baseRadius, band.inner.maxRadius]);
    const innerAmp = band.inner.waveAmp * waveFactor;
    const innerPhase = wavePhase.value + band.inner.phaseOffset;

    // Outer ring clockwise
    let d = '';
    for (let i = 0; i <= NUM_POINTS; i++) {
      const angle = (i / NUM_POINTS) * 2 * Math.PI;
      const wave = outerAmp * Math.sin(band.outer.numWaves * angle + outerPhase);
      const r = outerRadius + wave;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }

    // Inner ring counter-clockwise
    for (let i = NUM_POINTS; i >= 0; i--) {
      const angle = (i / NUM_POINTS) * 2 * Math.PI;
      const wave = innerAmp * Math.sin(band.inner.numWaves * angle + innerPhase);
      const r = innerRadius + wave;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      d += 'L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    d += 'Z';

    return { d };
  });

  return (
    <AnimatedPath
      fill={band.color}
      opacity={band.fillOpacity}
      stroke="none"
      animatedProps={animatedProps}
    />
  );
}

function AnimatedCenterDisc({
  expansionProgress,
}: {
  expansionProgress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    r: interpolate(expansionProgress.value, [0, 1], [60, 88]),
    opacity: interpolate(expansionProgress.value, [0, 1], [0.1, 0.18]),
  }));

  return (
    <AnimatedCircle
      cx={CENTER}
      cy={CENTER}
      fill={CENTER_COLOR}
      animatedProps={animatedProps}
    />
  );
}

export default function BreathingCircles({ expansionProgress, phaseLabel, phaseCountdown, isHolding }: Props) {
  const wavePhase = useSharedValue(0);

  // Start / pause wave animation based on hold state
  useEffect(() => {
    if (isHolding) {
      // Freeze waves in place during hold
      cancelAnimation(wavePhase);
    } else {
      // Resume from current position
      const current = wavePhase.value;
      wavePhase.value = withRepeat(
        withTiming(current + 2 * Math.PI, { duration: 14000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [isHolding, wavePhase]);

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansionProgress.value, [0, 0.05, 0.15, 1], [0.7, 0.85, 1, 1]),
  }));

  return (
    <View style={styles.container}>
      <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
        {/* Radial glow */}
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={RING_COLORS[0]} stopOpacity="0.14" />
            <Stop offset="40%" stopColor={RING_COLORS[1]} stopOpacity="0.08" />
            <Stop offset="70%" stopColor={RING_COLORS[2]} stopOpacity="0.04" />
            <Stop offset="100%" stopColor={RING_COLORS[3]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="url(#glow)" />

        {/* Gradient color bands between rings — follow wavy contours */}
        {BAND_CONFIG.map((band, i) => (
          <WavyBand
            key={`band-${i}`}
            band={band}
            expansionProgress={expansionProgress}
            wavePhase={wavePhase}
          />
        ))}

        {/* Soft center disc */}
        <AnimatedCenterDisc expansionProgress={expansionProgress} />

        {/* Wavy stroke rings — outermost first */}
        {[...RING_CONFIG].reverse().map((config, i) => (
          <WavyRing
            key={i}
            config={config}
            expansionProgress={expansionProgress}
            wavePhase={wavePhase}
          />
        ))}
      </Svg>

      {/* Center label */}
      <Animated.View style={[styles.labelContainer, labelAnimStyle]}>
        <Text style={styles.phaseLabel}>{phaseLabel}</Text>
        {phaseCountdown != null && (
          <Text style={styles.countdown}>{phaseCountdown}s</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdown: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: theme.typography.sizes.md,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});
