import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ValidationScreenProps {
  onComplete: () => void;
  userGoal?: string;
  desiredState?: string;
  overallProgress?: number;
  onBack?: () => void;
}

export default function ValidationScreen({
  onComplete,
  userGoal = 'a calmer, more disciplined state',
  desiredState,
  overallProgress,
  onBack,
}: ValidationScreenProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [stat1, setStat1] = useState(0);
  const [stat2, setStat2] = useState(0);

  useEffect(() => {
    // Checkmark bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        tension: 15,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 25,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle rotation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Count up animation for stats
    const stat1Interval = setInterval(() => {
      setStat1((prev) => {
        if (prev >= 73) {
          clearInterval(stat1Interval);
          return 73;
        }
        return prev + 3;
      });
    }, 30);

    const stat2Interval = setInterval(() => {
      setStat2((prev) => {
        if (prev >= 91) {
          clearInterval(stat2Interval);
          return 91;
        }
        return prev + 3;
      });
    }, 30);

    return () => {
      clearInterval(stat1Interval);
      clearInterval(stat2Interval);
    };
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  // Map desired-state values to natural validation messages
  const getValidationMessage = (): string => {
    switch (desiredState) {
      case 'calm-pressure':
        return 'Feeling calm under pressure is absolutely within your reach.';
      case 'clear-decisive':
        return 'Becoming clear and decisive is a realistic, proven goal.';
      case 'consistent':
        return 'Building real consistency is something you can achieve.';
      case 'grounded':
        return 'Feeling truly grounded is a realistic, achievable goal.';
      default:
        return 'The changes you want to see are absolutely realistic.';
    }
  };

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
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: scaleAnim }, { rotate: rotation }],
              },
            ]}
          >
            <Text style={styles.icon}>✓</Text>
          </Animated.View>

          <Text style={styles.title}>This is absolutely achievable</Text>

          <Text style={styles.message}>
            {getValidationMessage()}{'\n\n'}
            Most Seneca users notice clear changes within weeks — without burning out or relapsing.
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stat1}%</Text>
              <Text style={styles.statLabel}>See progress in week 1</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stat2}%</Text>
              <Text style={styles.statLabel}>Still active after 30 days</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Continue Button */}
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
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  icon: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 36,
  },
  message: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: theme.spacing.xl * 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
