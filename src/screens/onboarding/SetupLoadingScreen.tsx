import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';

interface SetupLoadingScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

const SETUP_STEPS = [
  { label: 'Reflection cadence', icon: 'clock-rotate-left' },
  { label: 'Prompt style', icon: 'pen-fancy' },
  { label: 'Challenge level', icon: 'fire' },
  { label: 'Philosophy blend', icon: 'book-open' },
  { label: 'Guidance tone', icon: 'comment' },
];

export default function SetupLoadingScreen({ onComplete, overallProgress, onBack }: SetupLoadingScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef(SETUP_STEPS.map(() => new Animated.Value(0))).current;
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 6000,
      useNativeDriver: false,
    }).start(() => setIsLoaded(true));

    // Stagger check animations
    const checkAnimations = fadeAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 1000),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(checkAnimations).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <AppBackground topSafeZone={0}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {/* Back Button */}
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <FontAwesome6 name="wand-magic-sparkles" size={32} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Setting up your experience...</Text>

          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.loadingBar,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>

          <View style={styles.checklistContainer}>
            {SETUP_STEPS.map((step, index) => (
              <Animated.View
                key={step.label}
                style={[
                  styles.checklistItem,
                  {
                    opacity: fadeAnims[index],
                    transform: [
                      {
                        translateX: fadeAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.stepIconContainer}>
                  <FontAwesome6 name={step.icon} size={14} color={theme.colors.primary} />
                </View>
                <Text style={styles.checklistText}>{step.label}</Text>
                <View style={styles.checkbox}>
                  <FontAwesome6 name="check" size={11} color="#FFFFFF" />
                </View>
              </Animated.View>
            ))}
          </View>

          {!isLoaded && <Text style={styles.footer}>This will only take a moment...</Text>}
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.continueButton, !isLoaded && styles.continueButtonDisabled]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onComplete(); }}
          disabled={!isLoaded}
        >
          <Text style={[styles.continueButtonText, !isLoaded && styles.continueButtonTextDisabled]}>Continue</Text>
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
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl * 2,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  checklistContainer: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  footer: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
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
  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    opacity: 0.5,
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
});
