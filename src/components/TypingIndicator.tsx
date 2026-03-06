import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../theme';

const DOT_SIZE = 8;
const DOT_COLOR = 'rgba(60, 56, 52, 0.6)';

function TypingDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ translateY: -3 * progress.value }],
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function TypingIndicator() {
  return (
    <View style={styles.container}>
      <View style={styles.tailWrapper}>
        <Svg width={12} height={16} viewBox="0 0 12 16">
          <Path
            d="M 12 0 C 12 8 6 14 0 16 L 12 16 Z"
            fill={theme.colors.tertiary}
          />
        </Svg>
      </View>
      <View style={styles.bubble}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 8,
    paddingVertical: 8,
  },
  tailWrapper: {
    marginBottom: 0,
    marginRight: -3,
    zIndex: 1,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
  },
});
