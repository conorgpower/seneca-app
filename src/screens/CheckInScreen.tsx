import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
import { triggerHaptic } from '../hooks/useAppPreferences';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'CheckIn'>;

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
    <LinearGradient
      colors={['#A8C5E5', '#E5B3D8', '#F4D4E5']}
      style={styles.gradientContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Today's Journey</Text>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.popToTop()}
          >
            <Ionicons name="close" size={28} color="rgba(0, 0, 0, 0.7)" />
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
          <Text style={styles.journeyIcon}>🧠</Text>
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

            {/* Slider with Icons */}
            <View style={styles.sliderRow}>
              <Text style={styles.sliderIcon}>💔</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={moodValue}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#D97941"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.4)"
                  thumbTintColor="#FFFFFF"
                />
              </View>
              <Text style={styles.sliderIcon}>🔥</Text>
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
              <ActivityIndicator color="#4A2D6E" />
            ) : (
              <Text style={styles.continueButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
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
    color: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#000000',
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
  journeyIcon: {
    fontSize: 18,
  },
  journeyLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.8)',
    letterSpacing: 1,
  },
  journeyDuration: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(0, 0, 0, 0.6)',
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
    color: '#000000',
    textAlign: 'center',
    lineHeight: 36,
  },
  sliderSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodLabelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl * 1.5,
    marginBottom: theme.spacing.xl * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moodLabel: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing.md,
  },
  sliderIcon: {
    fontSize: 24,
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
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md + 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: '#000000',
  },
});
