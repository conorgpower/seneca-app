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
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VisionContrastScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

// Graph dimensions
const GRAPH_PADDING = 24;
const GRAPH_W = SCREEN_WIDTH - theme.spacing.xl * 2 - GRAPH_PADDING * 2;
const GRAPH_H = 200;
// Horizontal inset so circles at edges aren't clipped
const GRAPH_INSET = 10;

// Normalized points (x: 0-1 time, y: 0-1 motivation)
// "Seneca Chat" — steady upward curve
const WITH_POINTS = [
  { x: 0, y: 0.18 },
  { x: 0.14, y: 0.24 },
  { x: 0.28, y: 0.34 },
  { x: 0.42, y: 0.46 },
  { x: 0.56, y: 0.58 },
  { x: 0.70, y: 0.68 },
  { x: 0.85, y: 0.78 },
  { x: 1.0, y: 0.85 },
];

// "Traditional motivation" — spikes then fades
const WITHOUT_POINTS = [
  { x: 0, y: 0.18 },
  { x: 0.10, y: 0.38 },
  { x: 0.22, y: 0.46 },
  { x: 0.35, y: 0.40 },
  { x: 0.48, y: 0.33 },
  { x: 0.60, y: 0.28 },
  { x: 0.72, y: 0.25 },
  { x: 0.85, y: 0.23 },
  { x: 1.0, y: 0.22 },
];

function toPixel(pt: { x: number; y: number }) {
  return {
    px: GRAPH_INSET + pt.x * (GRAPH_W - 2 * GRAPH_INSET),
    py: (1 - pt.y) * GRAPH_H,
  };
}

/** Build a smooth cubic bezier SVG path from points */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const pixels = points.map(toPixel);
  let d = `M ${pixels[0].px} ${pixels[0].py}`;
  for (let i = 0; i < pixels.length - 1; i++) {
    const p0 = pixels[Math.max(0, i - 1)];
    const p1 = pixels[i];
    const p2 = pixels[i + 1];
    const p3 = pixels[Math.min(pixels.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.px + (p2.px - p0.px) * tension;
    const cp1y = p1.py + (p2.py - p0.py) * tension;
    const cp2x = p2.px - (p3.px - p1.px) * tension;
    const cp2y = p2.py - (p3.py - p1.py) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.px} ${p2.py}`;
  }
  return d;
}

/** Build a closed fill path (line path + close along bottom) */
function buildFillPath(points: { x: number; y: number }[]): string {
  const linePath = buildSmoothPath(points);
  const lastPx = toPixel(points[points.length - 1]);
  const firstPx = toPixel(points[0]);
  return `${linePath} L ${lastPx.px} ${GRAPH_H} L ${firstPx.px} ${GRAPH_H} Z`;
}

/** Build a closed fill path between two curves (top line forward, bottom line reversed) */
function buildBetweenPath(topPoints: { x: number; y: number }[], bottomPoints: { x: number; y: number }[]): string {
  const topPath = buildSmoothPath(topPoints);
  const reversedPath = buildSmoothPath([...bottomPoints].reverse());
  return `${topPath} ${reversedPath.replace(/^M/, 'L')} Z`;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function VisionContrastScreen({
  onComplete,
  overallProgress,
  onBack,
}: VisionContrastScreenProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  const withPath = buildSmoothPath(WITH_POINTS);
  const withoutPath = buildSmoothPath(WITHOUT_POINTS);
  const withoutFillPath = buildFillPath(WITHOUT_POINTS);
  const betweenFillPath = buildBetweenPath(WITH_POINTS, WITHOUT_POINTS);

  const withLength = 600;
  const withoutLength = 500;

  const withDashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [withLength, 0],
  });

  const withoutDashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [withoutLength, 0],
  });

  const fillOpacity = anim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        delay: 400,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const startPt = toPixel(WITH_POINTS[0]);
  const withEnd = toPixel(WITH_POINTS[WITH_POINTS.length - 1]);

  // Four faint dashed horizontal guide lines
  const dashY1 = toPixel({ x: 0, y: 0.25 }).py;
  const dashY2 = toPixel({ x: 0, y: 0.40 }).py;
  const dashY3 = toPixel({ x: 0, y: 0.60 }).py;
  const dashY4 = toPixel({ x: 0, y: 0.80 }).py;

  // "Traditional motivation" label — far right, fully below the grey (without) line
  // Without line at x=1.0 is y=0.22 → pixel 156. Place label below that.
  const withoutEndPt = toPixel(WITHOUT_POINTS[WITHOUT_POINTS.length - 1]);
  const tradLabelY = withoutEndPt.py + 6;

  // "Seneca Chat" branding position — centered in the primary fill area between curves
  const brandingPos = toPixel({ x: 0.42, y: 0.46 });

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onComplete();
  };

  return (
    <AppBackground topSafeZone={0}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {overallProgress !== undefined && (
            <OnboardingProgressBar progress={overallProgress} />
          )}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Seneca Chat creates{'\n'}long-term motivation</Text>

          {/* Flex wrapper to center graph card in remaining space */}
          <View style={styles.graphWrapper}>
          <View style={styles.graphCard}>
            <Text style={styles.graphLabel}>Your Motivation</Text>

            <View style={styles.graphArea}>
              <Svg width={GRAPH_W} height={GRAPH_H + 2}>
                <Defs>
                  <LinearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.18" />
                    <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0.04" />
                  </LinearGradient>
                </Defs>

                {/* Four faint dashed guide lines */}
                <Line x1={0} y1={dashY1} x2={GRAPH_W} y2={dashY1}
                  stroke="#D0D0D0" strokeWidth={0.8} strokeDasharray="3 5" opacity={0.45} />
                <Line x1={0} y1={dashY2} x2={GRAPH_W} y2={dashY2}
                  stroke="#D0D0D0" strokeWidth={0.8} strokeDasharray="3 5" opacity={0.45} />
                <Line x1={0} y1={dashY3} x2={GRAPH_W} y2={dashY3}
                  stroke="#D0D0D0" strokeWidth={0.8} strokeDasharray="3 5" opacity={0.45} />
                <Line x1={0} y1={dashY4} x2={GRAPH_W} y2={dashY4}
                  stroke="#D0D0D0" strokeWidth={0.8} strokeDasharray="3 5" opacity={0.45} />

                {/* Grey fill under the grey (without) line */}
                <AnimatedPath
                  d={withoutFillPath}
                  fill="#AAAAAA"
                  opacity={fillOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.1],
                  })}
                />

                {/* Primary fill between the two lines (above grey, below black) */}
                <AnimatedPath
                  d={betweenFillPath}
                  fill="url(#primaryFill)"
                  opacity={fillOpacity}
                />

                {/* "Traditional motivation" line (grey) */}
                <AnimatedPath
                  d={withoutPath}
                  stroke="#AAAAAA"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={`${withoutLength}`}
                  strokeDashoffset={withoutDashOffset}
                />

                {/* "Seneca Chat" line (black) */}
                <AnimatedPath
                  d={withPath}
                  stroke="#1A1A1A"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={`${withLength}`}
                  strokeDashoffset={withDashOffset}
                />

                {/* X-axis solid line */}
                <Line
                  x1={0} y1={GRAPH_H} x2={GRAPH_W} y2={GRAPH_H}
                  stroke="#888888" strokeWidth={1}
                />

                {/* Start circle — white with dark outline */}
                <AnimatedCircle
                  cx={startPt.px}
                  cy={startPt.py}
                  r={5}
                  fill="#FFFFFF"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  opacity={labelOpacity}
                />

                {/* End circle on Seneca line — white with dark outline */}
                <AnimatedCircle
                  cx={withEnd.px}
                  cy={withEnd.py}
                  r={5}
                  fill="#FFFFFF"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  opacity={labelOpacity}
                />
              </Svg>

              {/* "Traditional motivation" label — far right, below the grey line */}
              <Animated.View style={[styles.tradMotivLabel, {
                top: tradLabelY,
                right: 12,
                opacity: labelOpacity,
              }]}>
                <Text style={styles.tradMotivText}>Traditional{'\n'}motivation</Text>
              </Animated.View>

              {/* "Seneca Chat" branding inside the primary fill area */}
              <Animated.View style={[styles.brandingInGraph, {
                top: brandingPos.py - 16,
                right: 12,
                opacity: labelOpacity,
              }]}>
                <Text style={styles.brandingName}>Seneca Chat</Text>
                <View style={styles.brandingTag}>
                  <Text style={styles.brandingTagText}>Motivation</Text>
                </View>
              </Animated.View>
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxis}>
              <Text style={styles.xLabel}>Month 1</Text>
              <Text style={styles.xLabel}>Month 6</Text>
            </View>
          </View>
          </View>
        </ScrollView>
      </View>

      {/* Continue */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  graphWrapper: {
    flex: 1,
    justifyContent: 'center',
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    lineHeight: 40,
  },

  // Graph card
  graphCard: {
    backgroundColor: '#F7F5F0',
    borderRadius: 20,
    padding: GRAPH_PADDING,
    overflow: 'hidden',
  },
  graphLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  graphArea: {
    position: 'relative',
  },
  tradMotivLabel: {
    position: 'absolute',
  },
  tradMotivText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    lineHeight: 14,
    textAlign: 'right',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },

  // Branding inside the primary fill area
  brandingInGraph: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  brandingName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  brandingTag: {
    backgroundColor: '#E8E5E0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  brandingTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
  },

  // Button
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  continueButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
