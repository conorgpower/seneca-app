import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VisionContrastScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

// Graph layout
const GRAPH_H = 180;
const GRAPH_W = SCREEN_WIDTH - 130; // account for padding + y-axis + balance

// Normalized points (x: 0-1 time, y: 0-1 clarity)
// "With Seneca" – steady upward curve
const WITH_POINTS = [
  { x: 0, y: 0.12 },
  { x: 0.12, y: 0.18 },
  { x: 0.25, y: 0.28 },
  { x: 0.38, y: 0.40 },
  { x: 0.50, y: 0.52 },
  { x: 0.62, y: 0.64 },
  { x: 0.75, y: 0.75 },
  { x: 0.88, y: 0.85 },
  { x: 1.0, y: 0.93 },
];

// "Without Seneca" – initial spike then stagnation / slight decline
const WITHOUT_POINTS = [
  { x: 0, y: 0.12 },
  { x: 0.10, y: 0.30 },
  { x: 0.22, y: 0.38 },
  { x: 0.34, y: 0.32 },
  { x: 0.46, y: 0.36 },
  { x: 0.58, y: 0.28 },
  { x: 0.70, y: 0.24 },
  { x: 0.82, y: 0.22 },
  { x: 1.0, y: 0.18 },
];

function toPixel(pt: { x: number; y: number }) {
  return {
    px: pt.x * GRAPH_W,
    py: (1 - pt.y) * GRAPH_H, // flip y so 0 is bottom
  };
}

/** Renders a single segment between two points */
function Segment({
  from,
  to,
  color,
  anim,
  index,
  total,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  anim: Animated.Value;
  index: number;
  total: number;
}) {
  const p1 = toPixel(from);
  const p2 = toPixel(to);
  const dx = p2.px - p1.px;
  const dy = p2.py - p1.py;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Each segment appears during its portion of the animation
  const segStart = index / total;
  const segEnd = (index + 1) / total;

  const scaleX = anim.interpolate({
    inputRange: [segStart, segEnd],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: p1.px,
        top: p1.py - 1.5,
        width: length,
        height: 3,
        backgroundColor: color,
        borderRadius: 1.5,
        transform: [
          { rotate: `${angle}deg` },
          { scaleX },
        ],
        transformOrigin: 'left center',
      }}
    />
  );
}

/** Renders an animated line from an array of points */
function AnimatedLine({
  points,
  color,
  anim,
}: {
  points: { x: number; y: number }[];
  color: string;
  anim: Animated.Value;
}) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push(
      <Segment
        key={i}
        from={points[i]}
        to={points[i + 1]}
        color={color}
        anim={anim}
        index={i}
        total={points.length - 1}
      />,
    );
  }

  // End dot
  const endPt = toPixel(points[points.length - 1]);
  const dotOpacity = anim.interpolate({
    inputRange: [0.85, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      {segments}
      <Animated.View
        style={{
          position: 'absolute',
          left: endPt.px - 5,
          top: endPt.py - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          opacity: dotOpacity,
        }}
      />
    </>
  );
}

/** Animated label that appears at the end of a line */
function EndLabel({
  point,
  label,
  color,
  anim,
  above,
}: {
  point: { x: number; y: number };
  label: string;
  color: string;
  anim: Animated.Value;
  above: boolean;
}) {
  const pt = toPixel(point);
  const opacity = anim.interpolate({
    inputRange: [0.88, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: pt.px - 60,
        top: above ? pt.py - 28 : pt.py + 14,
        opacity,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color, textAlign: 'right' }}>
        {label}
      </Text>
    </Animated.View>
  );
}

const X_LABELS = ['Today', '30 days', '60 days', '90 days'];

export default function VisionContrastScreen({
  onComplete,
  overallProgress,
  onBack,
}: VisionContrastScreenProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 2200,
      delay: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {overallProgress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
              </View>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Clarity compounds{'\n'}over time</Text>
          <Text style={styles.subtitle}>
            Most people struggle alone with inconsistent progress
          </Text>

          {/* Graph */}
          <Text style={styles.graphTitle}>Clarity Over Time</Text>
          <View style={styles.graphWrapper}>
            {/* Y-axis */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>High</Text>
              <Text style={styles.axisLabel}>Low</Text>
            </View>

            <View style={styles.graphOuter}>
              {/* Grid lines */}
              <View style={styles.graphBox}>
                {[0.25, 0.5, 0.75].map((frac) => (
                  <View
                    key={frac}
                    style={[styles.gridLine, { top: frac * GRAPH_H }]}
                  />
                ))}

                {/* Lines */}
                <AnimatedLine points={WITHOUT_POINTS} color={theme.colors.error} anim={anim} />
                <AnimatedLine points={WITH_POINTS} color={theme.colors.primary} anim={anim} />

                {/* End labels */}
                <EndLabel
                  point={WITH_POINTS[WITH_POINTS.length - 1]}
                  label="With Seneca"
                  color={theme.colors.primary}
                  anim={anim}
                  above
                />
                <EndLabel
                  point={WITHOUT_POINTS[WITHOUT_POINTS.length - 1]}
                  label="Without"
                  color={theme.colors.error}
                  anim={anim}
                  above={false}
                />
              </View>

              {/* X-axis */}
              <View style={styles.xAxis}>
                {X_LABELS.map((label) => (
                  <Text key={label} style={styles.xLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>With Seneca: steady, compound growth</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.legendText}>Alone: motivation spikes, then drop-offs</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Continue */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 1.5,
    lineHeight: 24,
  },
  graphTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  graphWrapper: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    marginLeft: -12,
  },
  yAxis: {
    width: 36,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 28,
  },
  axisLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  graphOuter: {
    flex: 1,
  },
  graphBox: {
    height: GRAPH_H,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'visible',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.3,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
  },
  xLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  legend: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
