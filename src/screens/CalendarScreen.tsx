import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import * as TodayService from '../services/today.service';
import * as AchievementsService from '../services/achievements.service';
import {
  ACHIEVEMENTS,
  TOTAL_ACHIEVEMENTS,
} from '../data/achievements';
import type { AchievementDefinition } from '../data/achievements';
import type { MainStackParamList } from '../navigation/MainNavigator';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FireIcon,
  LockClosedIcon,
  TrophyIcon,
  CheckCircleIcon,
} from 'react-native-heroicons/solid';
import { AppBackground } from '../components/AppBackground';
import ScrollIcon from '../components/ScrollIcon';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type CalendarNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigationProp>();
  const { user } = useAuth();
  const { currentStreak: streakData } = useToday();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockedDates, setUnlockedDates] = useState<Record<string, string>>({});
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  // Load achievements
  useEffect(() => {
    if (!user) return;
    AchievementsService.getUserAchievements(user.id).then(({ data }) => {
      setUnlockedIds(new Set(data.map((a) => a.achievement_id)));
      const dates: Record<string, string> = {};
      for (const a of data) {
        dates[a.achievement_id] = new Date(a.unlocked_at).toLocaleDateString();
      }
      setUnlockedDates(dates);
    });
  }, [user]);

  const unlockedCount = unlockedIds.size;

  // Build display list: recent unlocked + next locked
  const displayAchievements = (() => {
    const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
    const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));
    const recent = unlocked.slice(0, 3);
    const next = locked.slice(0, Math.max(2, 5 - recent.length));
    return [...recent, ...next];
  })();

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
                isPastIncomplete && styles.dayPastIncomplete,
                isFuture && styles.dayFuture,
                isCompleted && styles.dayCompleted,
                isToday && !isCompleted && styles.dayToday,
              ]}
              disabled={isFuture}
            >
              <Text style={[
                styles.dayText,
                isPastIncomplete && styles.dayTextPastIncomplete,
                isFuture && styles.dayTextFuture,
                isCompleted && styles.dayTextCompleted,
                isToday && !isCompleted && styles.dayTextToday,
              ]}>
                {day}
              </Text>
              {isPastIncomplete && (
                <View style={styles.lockIconView}>
                  <LockClosedIcon size={10} color={theme.colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const slideDistance = screenWidth * 0.25;
    const exitDir = direction === 'next' ? -slideDistance : slideDistance;
    const enterDir = direction === 'next' ? slideDistance : -slideDistance;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: exitDir,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCompletedDays(new Set());
      setCurrentMonth(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newDate;
      });

      slideAnim.setValue(enterDir);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const monthYear = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Streak Calendar</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <XMarkIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
              <ChevronLeftIcon size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYear}</Text>
            <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
              <ChevronRightIcon size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header + Calendar Grid */}
          <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>
            <View style={styles.daysOfWeekContainer}>
              {DAYS_OF_WEEK.map(day => (
                <View key={day} style={styles.dayOfWeekCell}>
                  <Text style={styles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            {renderCalendar()}
          </Animated.View>

          {/* Stats */}
          <View style={styles.bottomSection}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <FireIcon size={24} color={theme.colors.primary} />
                  <Text style={styles.statValue}>{currentStreakValue}</Text>
                </View>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <TrophyIcon size={24} color={theme.colors.primary} />
                  <Text style={styles.statValue}>{longestStreakValue}</Text>
                </View>
                <Text style={styles.statLabel}>Longest Streak</Text>
              </View>
            </View>
          </View>

          {/* Achievements Section */}
          <View style={styles.achievementsSection}>
            <View style={styles.achievementsHeader}>
              <Text style={styles.achievementsSectionTitle}>Scrolls of Wisdom</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AchievementsList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.achievementsSubtitle}>
              {unlockedCount} of {TOTAL_ACHIEVEMENTS} scrolls unlocked
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScrollContent}
            >
              {displayAchievements.map((item) => {
                const isUnlocked = unlockedIds.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.achievementCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedAchievement(item)}
                  >
                    <ScrollIcon
                      achievementId={item.id}
                      unlocked={isUnlocked}
                      size="md"
                    />
                    <Text
                      style={[
                        styles.achievementName,
                        !isUnlocked && styles.achievementNameLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {selectedAchievement && (() => {
              const isUnlocked = unlockedIds.has(selectedAchievement.id);
              return (
                <>
                  <ScrollIcon
                    achievementId={selectedAchievement.id}
                    unlocked={isUnlocked}
                    size="lg"
                  />
                  <Text style={styles.modalName}>{selectedAchievement.name}</Text>
                  <Text style={styles.modalDescription}>
                    {selectedAchievement.description}
                  </Text>
                  <View style={styles.modalConditionRow}>
                    <Text style={styles.modalConditionLabel}>How to unlock</Text>
                    <Text style={styles.modalCondition}>
                      {selectedAchievement.condition}
                    </Text>
                  </View>
                  {isUnlocked && unlockedDates[selectedAchievement.id] ? (
                    <View style={styles.modalUnlockedBadge}>
                      <CheckCircleIcon size={16} color={theme.colors.primary} />
                      <Text style={styles.modalUnlockedText}>
                        Unlocked {unlockedDates[selectedAchievement.id]}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalLockedBadge}>
                      <Text style={styles.modalLockedText}>Locked</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </AppBackground>
  );
}

const screenWidth = Dimensions.get('window').width;
const calendarPadding = theme.spacing.lg * 2;
const cellSize = (screenWidth - calendarPadding) / 7;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
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
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dayCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayPastIncomplete: {
    backgroundColor: theme.colors.backgroundCard,
  },
  dayFuture: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  dayTextCompleted: {
    color: theme.colors.background,
    fontWeight: '700',
  },
  dayTextFuture: {
    color: theme.colors.textTertiary,
  },
  dayTextPastIncomplete: {
    color: theme.colors.textSecondary,
  },
  dayTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  lockIconView: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  bottomSection: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
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
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  // Achievements
  achievementsSection: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  achievementsSectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  achievementsSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  achievementsScrollContent: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  achievementCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  achievementName: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  achievementNameLocked: {
    color: theme.colors.textTertiary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  modalName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  modalConditionRow: {
    width: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  modalConditionLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalCondition: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  modalUnlockedText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalLockedBadge: {
    marginTop: theme.spacing.xs,
  },
  modalLockedText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
});
