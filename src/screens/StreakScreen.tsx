import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import * as TodayService from '../services/today.service';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { triggerHaptic } from '../hooks/useAppPreferences';

const REMINDER_PROMPT_KEY = 'lastReminderPromptDate';
const REMINDER_PROMPT_COOLDOWN_DAYS = 7;

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Streak'>;
type StreakRouteProp = RouteProp<MainStackParamList, 'Streak'>;

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function StreakScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<StreakRouteProp>();
  const { user } = useAuth();
  const { weeklyCompletions } = useToday();
  const { newStreak } = route.params;

  const [shouldShowReminder, setShouldShowReminder] = useState(false);
  const [reminderCheckDone, setReminderCheckDone] = useState(false);
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    checkReminder();
    animateIn();
    triggerHaptic('success');
  }, []);

  const checkReminder = async () => {
    if (!user) {
      setReminderCheckDone(true);
      return;
    }

    try {
      const { data } = await TodayService.getUserReminder(user.id);

      // Show reminder screen if reminders are not enabled
      const remindersEnabled = data?.enabled === true;

      if (!remindersEnabled) {
        // Rate-limit: only prompt once per cooldown period
        const lastPrompt = await AsyncStorage.getItem(REMINDER_PROMPT_KEY);
        if (lastPrompt) {
          const daysSince = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24);
          setShouldShowReminder(daysSince >= REMINDER_PROMPT_COOLDOWN_DAYS);
        } else {
          setShouldShowReminder(true);
        }
      }
    } catch (error) {
      console.error('Error checking reminder:', error);
    } finally {
      setReminderCheckDone(true);
    }
  };

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleContinue = async () => {
    if (shouldShowReminder) {
      // Record that we prompted, so we don't pester again within the cooldown
      await AsyncStorage.setItem(REMINDER_PROMPT_KEY, Date.now().toString());
      navigation.navigate('Reminder');
    } else {
      navigation.popToTop();
    }
  };

  const getStreakMessage = () => {
    if (newStreak === 1) {
      return 'Come back tomorrow to keep your streak going and grow closer to your wisest self.';
    } else if (newStreak < 7) {
      return 'Keep building momentum!';
    } else if (newStreak < 30) {
      return "You're on fire!";
    } else {
      return 'Incredible dedication!';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Celebration */}
        <Animated.View
          style={[
            styles.celebrationContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.flame}>🔥</Text>
          <Text style={styles.streakNumber}>{newStreak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </Animated.View>

        {/* Message */}
        <Text style={styles.message}>{getStreakMessage()}</Text>

        {/* Weekly View */}
        <View style={styles.weeklySection}>
          <Text style={styles.weeklyLabel}>This Week</Text>
          <View style={styles.weeklyDots}>
            {weeklyCompletions.map((day, index) => {
              const dayNumber = parseInt(day.date.split('-')[2], 10);
              return (
                <View key={day.date} style={styles.dayColumn}>
                  {day.completed ? (
                    <Text style={styles.flameEmoji}>🔥</Text>
                  ) : (
                    <View style={[styles.dot, day.isToday && styles.dotToday]}>
                      <Text style={[styles.dayNumber, day.isToday && styles.dayNumberToday]}>
                        {dayNumber}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                    {WEEKDAY_LABELS[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !reminderCheckDone && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!reminderCheckDone}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  flame: {
    fontSize: 80,
    marginBottom: theme.spacing.md,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  streakLabel: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '500',
    color: theme.colors.text,
  },
  message: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  weeklySection: {
    alignItems: 'center',
  },
  weeklyLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  weeklyDots: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dayColumn: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  flameEmoji: {
    fontSize: 30,
    height: 38,
    textAlignVertical: 'center',
    lineHeight: 38,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotToday: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  dayNumberToday: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  dayLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },
  dayLabelToday: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
