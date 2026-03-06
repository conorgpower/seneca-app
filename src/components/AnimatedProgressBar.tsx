import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

const THUMB_SIZE = 14;
const THUMB_ACTIVE_SIZE = 18;

interface AnimatedProgressBarProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Height of the bar (default: 6) */
  height?: number;
  /** Track (background) color */
  trackColor?: string;
  /** Fill color — used as the primary gradient color */
  fillColor?: string;
  /** Optional secondary gradient color (defaults to a slightly lighter shade) */
  fillColorSecondary?: string;
  /** Animation duration in ms for each progress update (default: 900) */
  animationDuration?: number;
  /** Called when user drags to seek. If omitted, the bar is non-interactive. */
  onSeek?: (progress: number) => void;
  /** Container style overrides */
  style?: ViewStyle;
}

export default function AnimatedProgressBar({
  progress,
  height = 6,
  trackColor = 'rgba(255,255,255,0.08)',
  fillColor = '#DEAD5C',
  fillColorSecondary,
  animationDuration = 900,
  onSeek,
  style,
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const thumbScale = useSharedValue(1);

  // Smoothly animate to each new progress value (unless dragging)
  useEffect(() => {
    if (!isDragging.value) {
      animatedProgress.value = withTiming(progress, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [progress, animationDuration]);

  const handleSeek = useCallback(
    (p: number) => {
      onSeek?.(p);
    },
    [onSeek],
  );

  // Pan + tap gesture for seeking
  const panGesture = Gesture.Pan()
    .enabled(!!onSeek)
    .hitSlop({ top: 16, bottom: 16 })
    .onBegin((e) => {
      isDragging.value = true;
      thumbScale.value = withSpring(1.4, { damping: 15, stiffness: 300 });
      const p = clamp(e.x / trackWidth.value, 0, 1);
      animatedProgress.value = p;
    })
    .onUpdate((e) => {
      const p = clamp(e.x / trackWidth.value, 0, 1);
      animatedProgress.value = p;
    })
    .onEnd((e) => {
      const p = clamp(e.x / trackWidth.value, 0, 1);
      runOnJS(handleSeek)(p);
    })
    .onFinalize(() => {
      isDragging.value = false;
      thumbScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!!onSeek)
    .hitSlop({ top: 16, bottom: 16 })
    .onEnd((e) => {
      const p = clamp(e.x / trackWidth.value, 0, 1);
      animatedProgress.value = withTiming(p, { duration: 200 });
      runOnJS(handleSeek)(p);
    });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => {
    const widthPercent = interpolate(animatedProgress.value, [0, 1], [0, 100]);
    return {
      width: `${widthPercent}%` as any,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const left = animatedProgress.value * trackWidth.value;
    return {
      transform: [
        { translateX: left - THUMB_SIZE / 2 },
        { scale: thumbScale.value },
      ],
    };
  });

  const secondary = fillColorSecondary || lightenColor(fillColor, 0.12);

  const bar = (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}
      onLayout={(e) => {
        trackWidth.value = e.nativeEvent.layout.width;
      }}
    >
      {/* Filled portion */}
      <Animated.View style={[styles.fillContainer, { borderRadius: height / 2 }, fillStyle]}>
        <LinearGradient
          colors={[fillColor, secondary, fillColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: height / 2 }]}
        />
      </Animated.View>

      {/* Thumb indicator */}
      {onSeek && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: fillColor,
              top: (height - THUMB_SIZE) / 2,
            },
            thumbStyle,
          ]}
        />
      )}
    </View>
  );

  if (onSeek) {
    return (
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>{bar}</GestureDetector>
      </GestureHandlerRootView>
    );
  }

  return bar;
}

/** Lighten a hex color by a small factor */
function lightenColor(hex: string, factor: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  const newR = Math.min(255, Math.round(r + (255 - r) * factor));
  const newG = Math.min(255, Math.round(g + (255 - g) * factor));
  const newB = Math.min(255, Math.round(b + (255 - b) * factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'visible',
    position: 'relative',
  },
  fillContainer: {
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
