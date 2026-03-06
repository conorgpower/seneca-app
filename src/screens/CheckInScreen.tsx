import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import * as TodayService from '../services/today.service';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { Ionicons } from '@expo/vector-icons';
import { FireIcon, FaceFrownIcon } from 'react-native-heroicons/solid';
import { triggerHaptic } from '../hooks/useAppPreferences';
import { AnimatedMeshGradient } from '../components/AnimatedMeshGradient';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'CheckIn'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mood labels for each slider value (0-100, stepping by 10)
const MOOD_LABELS: { [key: number]: string } = {
  0: 'Overwhelmed',
  10: 'Struggling',
  20: 'Uneasy',
  30: 'Uncertain',
  40: 'Managing',
  50: 'Balanced',
  60: 'Steady',
  70: 'Confident',
  80: 'Strong',
  90: 'Thriving',
  100: 'Centered',
};

export default function CheckInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const {
    todayProgress,
    currentStreak,
    optimisticallyCompleteStage,
    optimisticallyCompleteToday,
  } = useToday();
  const [moodValue, setMoodValue] = useState(50);
  const [submitting, setSubmitting] = useState(false);


  // Round to nearest 10 for snapping
  const snapToStep = (value: number) => {
    return Math.round(value / 10) * 10;
  };

  const handleSliderChange = (value: number) => {
    setMoodValue(value);
  };

  const handleSliderComplete = (value: number) => {
    setMoodValue(snapToStep(value));
  };

  const handleContinue = () => {
    if (!user) return;

    const snappedValue = snapToStep(moodValue);
    triggerHaptic('success');
    const alreadyComplete =
      (todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.passageCompleted ?? false) &&
      (todayProgress?.insightCompleted ?? false);
    const willCompleteToday =
      !alreadyComplete &&
      !(todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.passageCompleted ?? false) &&
      (todayProgress?.insightCompleted ?? false);

    if (willCompleteToday) {
      const newStreak = (currentStreak?.current_streak || 0) + 1;
      optimisticallyCompleteToday();
      navigation.navigate('Streak', { newStreak });
    } else {
      optimisticallyCompleteStage('check_in');
      navigation.navigate('Passage', { checkInValue: snappedValue });
    }

    // Save in background
    TodayService.submitCheckIn(user.id, snappedValue)
      .catch((err) => console.error('Error submitting check-in:', err));
  };

  const progress = todayProgress?.progressPercentage || 0;
  const currentMoodLabel = MOOD_LABELS[snapToStep(moodValue)] || 'Balanced';

  return (
    <View style={styles.container}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        borderRadius={0}
        baseColors={['#0F2E2E', '#1A3D3D']}
        blobColors={['#6EECD0', '#42C8A8']}
        duration={8000}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Today's Journey</Text>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.popToTop()}
          >
            <Ionicons name="close" size={28} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress today</Text>
            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#FFB84D', '#FF8C42', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        {/* Journey Label */}
        <View style={styles.journeyLabelContainer}>
          <FireIcon size={18} color="rgba(255, 255, 255, 0.85)" />
          <Text style={styles.journeyLabel}>PHILOSOPHY JOURNEY</Text>
          <Text style={styles.journeyDuration}>• 1 MIN</Text>
        </View>

        <View style={styles.content}>
          {/* Main Question */}
          <View style={styles.questionSection}>
            <Text style={styles.question}>How steady do you feel today?</Text>
          </View>

          {/* Slider Section */}
          <View style={styles.sliderSection}>
            {/* Current Mood Label */}
            <View style={styles.moodLabelContainer}>
              <Text style={styles.moodLabel}>{currentMoodLabel}</Text>
            </View>

            {/* Slider with Icons — icons scale with mood */}
            <View style={styles.sliderRow}>
              <FaceFrownIcon
                size={18 + 12 * (1 - moodValue / 100)}
                color={theme.colors.tertiary}
              />
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={moodValue}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#6EECD0"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.25)"
                  thumbTintColor="#FFFFFF"
                />
              </View>
              <FireIcon
                size={18 + 12 * (moodValue / 100)}
                color={theme.colors.primary}
              />
            </View>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, submitting && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.continueButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2E2E',
  },
  safeArea: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  journeyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    gap: 6,
  },
  journeyLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  journeyDuration: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  questionSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xl * 1.5,
  },
  question: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sliderSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodLabelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl * 1.5,
    marginBottom: theme.spacing.xl * 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  moodLabel: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing.md,
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  spacer: {
    flex: 0.2,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md + 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
