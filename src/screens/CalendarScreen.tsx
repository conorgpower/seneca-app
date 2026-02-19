import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import * as TodayService from '../services/today.service';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currentStreak: streakData } = useToday();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());

  const currentStreakValue = streakData?.current_streak || 0;
  const longestStreakValue = streakData?.longest_streak || 0;

  useEffect(() => {
    if (!user) return;
    TodayService.getMonthCompletions(
      user.id,
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    ).then(({ data }) => {
      setCompletedDays(new Set(data));
    });
  }, [currentMonth, user]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const todayDate = new Date();
    const isCurrentMonth =
      currentMonth.getFullYear() === todayDate.getFullYear() &&
      currentMonth.getMonth() === todayDate.getMonth();
    const todayDay = isCurrentMonth ? todayDate.getDate() : null;
    const isCurrentMonthInPast =
      currentMonth.getFullYear() < todayDate.getFullYear() ||
      (currentMonth.getFullYear() === todayDate.getFullYear() &&
        currentMonth.getMonth() < todayDate.getMonth());

    return (
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isCompleted = completedDays.has(day);
          const isToday = todayDay !== null && day === todayDay;
          const isFuture = !isCurrentMonthInPast && (isCurrentMonth ? day > todayDate.getDate() : true);
          const isPastIncomplete = !isCompleted && !isToday && !isFuture;

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                styles.dayCircle,
                isCompleted && !isToday && styles.dayCompleted,
                isToday && styles.dayToday,
              ]}
              disabled={isFuture}
            >
              <Text style={[
                styles.dayText,
                isCompleted && !isToday && styles.dayTextCompleted,
                isFuture && styles.dayTextFuture,
                isToday && styles.dayTextToday,
              ]}>
                {day}
              </Text>
              {isPastIncomplete && (
                <Text style={styles.lockIcon}>🔒</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const monthYear = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYear}</Text>
            <TouchableOpacity onPress={() => navigateMonth('next')}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.daysOfWeekContainer}>
            {DAYS_OF_WEEK.map(day => (
              <View key={day} style={styles.dayOfWeekCell}>
                <Text style={styles.dayOfWeekText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          {renderCalendar()}

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity style={styles.widgetButton}>
              <Text style={styles.widgetButtonText}>Add Daily Streak Widgets</Text>
              <Text style={styles.widgetIcon}>📱</Text>
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>🔥 {currentStreakValue}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>🔥 {longestStreakValue}</Text>
                <Text style={styles.statLabel}>Longest Streak</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const calendarPadding = theme.spacing.lg * 2;
const cellSize = (screenWidth - calendarPadding) / 7;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  navArrow: {
    fontSize: 32,
    color: theme.colors.text,
    fontWeight: '300',
  },
  monthText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '500',
    color: theme.colors.text,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  dayOfWeekCell: {
    width: cellSize,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
  },
  dayCell: {
    width: cellSize,
    height: cellSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  dayCircle: {
    borderRadius: cellSize / 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayToday: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  dayText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  dayTextCompleted: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  dayTextFuture: {
    color: theme.colors.textSecondary,
  },
  dayTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  lockIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
  },
  bottomSection: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  widgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  widgetButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '500',
    color: theme.colors.text,
  },
  widgetIcon: {
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});
