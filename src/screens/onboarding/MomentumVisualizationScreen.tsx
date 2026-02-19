import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface MomentumVisualizationScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

const MILESTONES = [
  { days: 3, title: 'Clarity spark', emoji: '✨', description: 'First moments of calm' },
  { days: 7, title: 'Emotional control', emoji: '🎯', description: 'Respond, not react' },
  { days: 30, title: 'Habit formation', emoji: '📈', description: 'Practice becomes natural' },
  { days: 90, title: 'Identity shift', emoji: '👑', description: 'You become who you practice' },
];

export default function MomentumVisualizationScreen({
  onComplete,
  overallProgress,
  onBack,
}: MomentumVisualizationScreenProps) {
  const fadeAnims = useRef(MILESTONES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Stagger the animations
    const animations = fadeAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 400),
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();
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
          <Text style={styles.title}>Your potential trajectory</Text>
          <Text style={styles.subtitle}>Here's what to expect when you stay consistent</Text>

          <View style={styles.timeline}>
            {MILESTONES.map((milestone, index) => {
              const isLast = index === MILESTONES.length - 1;

              return (
                <Animated.View
                  key={milestone.days}
                  style={[
                    styles.milestoneContainer,
                    {
                      opacity: fadeAnims[index],
                      transform: [
                        {
                          translateY: fadeAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.milestone}>
                    <View style={styles.dotContainer}>
                      <View style={styles.dot} />
                      {!isLast && <View style={styles.line} />}
                    </View>

                    <View style={styles.milestoneContent}>
                      <View style={styles.milestoneHeader}>
                        <Text style={styles.emoji}>{milestone.emoji}</Text>
                        <View style={styles.milestoneTextContainer}>
                          <Text style={styles.milestoneDays}>{milestone.days} days</Text>
                          <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                        </View>
                      </View>
                      <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Small, daily actions compound into lasting transformation
            </Text>
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 2,
    lineHeight: 24,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  timeline: {
    paddingLeft: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  milestoneContainer: {
    marginBottom: theme.spacing.xl,
  },
  milestone: {
    flexDirection: 'row',
  },
  dotContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.background,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    minHeight: 40,
  },
  milestoneContent: {
    flex: 1,
    paddingBottom: theme.spacing.md,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  emoji: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  milestoneTextContainer: {
    flex: 1,
  },
  milestoneDays: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  milestoneDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 32,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
});
