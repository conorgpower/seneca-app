import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import * as TodayService from '../services/today.service';
import * as NotificationsService from '../services/notifications.service';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { triggerHaptic } from '../hooks/useAppPreferences';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Reminder'>;

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 7 },
];

export default function ReminderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [hour, setHour] = useState(8);      // 1–12
  const [minute, setMinute] = useState(0);  // 0–55 in 5-min steps
  const [isPM, setIsPM] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [saving, setSaving] = useState(false);

  const incrementHour = () => setHour(h => (h === 12 ? 1 : h + 1));
  const decrementHour = () => setHour(h => (h === 1 ? 12 : h - 1));
  const incrementMinute = () => setMinute(m => (m + 5) % 60);
  const decrementMinute = () => setMinute(m => (m === 0 ? 55 : m - 5));

  const getTimeValue = () => {
    let h = hour;
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    setSaving(true);
    try {
      // Request notification permissions first
      const granted = await NotificationsService.requestNotificationPermissions();
      if (!granted) {
        alert('Notifications are disabled. Enable them in Settings to receive daily reminders.');
        setSaving(false);
        return;
      }

      const timeValue = getTimeValue();

      // Save to database
      const { error } = await TodayService.saveReminder(user.id, {
        enabled: true,
        reminder_time: timeValue,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        days_of_week: selectedDays,
      });

      if (error) {
        console.error('Error saving reminder:', error);
        alert('Failed to save reminder. Please try again.');
        return;
      }

      // Schedule device notifications
      let h = hour;
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      await NotificationsService.scheduleReminders(h, minute, selectedDays);
      triggerHaptic('success');

      navigation.popToTop();
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Bell + Copy */}
        <View style={styles.heroSection}>
          <Text style={styles.bellEmoji}>🔔</Text>
          <Text style={styles.heading}>Stay on the path each day</Text>
          <Text style={styles.subheading}>
            Set a daily reminder to complete your practice and keep building the habit of a wiser life.
          </Text>
        </View>

        {/* Time Picker */}
        <View style={styles.timePickerCard}>
          <View style={styles.timePicker}>
            {/* Hour */}
            <View style={styles.timeColumn}>
              <TouchableOpacity onPress={incrementHour} style={styles.arrowButton}>
                <Ionicons name="chevron-up" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{hour.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={decrementHour} style={styles.arrowButton}>
                <Ionicons name="chevron-down" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            {/* Minute */}
            <View style={styles.timeColumn}>
              <TouchableOpacity onPress={incrementMinute} style={styles.arrowButton}>
                <Ionicons name="chevron-up" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{minute.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={decrementMinute} style={styles.arrowButton}>
                <Ionicons name="chevron-down" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* AM / PM */}
            <View style={styles.ampmColumn}>
              <TouchableOpacity
                style={[styles.ampmButton, !isPM && styles.ampmButtonActive]}
                onPress={() => setIsPM(false)}
              >
                <Text style={[styles.ampmText, !isPM && styles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmButton, isPM && styles.ampmButtonActive]}
                onPress={() => setIsPM(true)}
              >
                <Text style={[styles.ampmText, isPM && styles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Which days?</Text>
          <View style={styles.daysGrid}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.value) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDay(day.value)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.value) && styles.dayButtonTextSelected,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.saveButtonText}>Save Reminder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 1.5,
  },
  bellEmoji: {
    fontSize: 72,
    marginBottom: theme.spacing.lg,
  },
  heading: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 32,
  },
  subheading: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  timePickerCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl * 1.5,
    alignItems: 'center',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  timeColumn: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  arrowButton: {
    padding: theme.spacing.xs,
  },
  timeDigit: {
    fontSize: 52,
    fontWeight: '300',
    color: theme.colors.text,
    letterSpacing: 2,
    minWidth: 72,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 44,
    fontWeight: '300',
    color: theme.colors.text,
    marginBottom: 6,
  },
  ampmColumn: {
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  ampmButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  ampmButtonActive: {
    backgroundColor: theme.colors.primary + '25',
  },
  ampmText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  ampmTextActive: {
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dayButton: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.backgroundCard,
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  dayButtonTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  actionButtons: {
    gap: theme.spacing.md,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.background,
  },
  skipButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
});
