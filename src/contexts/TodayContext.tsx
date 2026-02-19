import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import * as TodayService from '../services/today.service';
import { getDailyPassage } from '../services/philosophical-passages.service';
import type { PhilosophicalPassage } from '../services/philosophical-passages.service';
import type {
  DailyCompletion,
  UserStreak,
  TodayProgress,
  WeeklyCompletion,
} from '../types/today.types';

type TodayStage = 'check_in' | 'passage' | 'insight';

interface TodayContextType {
  todayProgress: TodayProgress | null;
  currentStreak: UserStreak | null;
  todayCompletion: DailyCompletion | null;
  weeklyCompletions: WeeklyCompletion[];
  dailyPassage: PhilosophicalPassage | null;
  loading: boolean;
  refreshProgress: () => Promise<void>;
  optimisticallyCompleteStage: (stage: TodayStage) => void;
  optimisticallyCompleteToday: () => void;
}

const TodayContext = createContext<TodayContextType | undefined>(undefined);

export function TodayProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [todayProgress, setTodayProgress] = useState<TodayProgress | null>(null);
  const [currentStreak, setCurrentStreak] = useState<UserStreak | null>(null);
  const [todayCompletion, setTodayCompletion] = useState<DailyCompletion | null>(null);
  const [weeklyCompletions, setWeeklyCompletions] = useState<WeeklyCompletion[]>([]);
  const [dailyPassage, setDailyPassage] = useState<PhilosophicalPassage | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActiveDate = useRef<string>(new Date().toDateString());
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load today's data from the database
   */
  const refreshProgress = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel, including the daily passage for instant navigation
      const [progressResult, streakResult, completionResult, weeklyResult, passage] = await Promise.all([
        TodayService.getTodayProgress(user.id),
        TodayService.getUserStreak(user.id),
        TodayService.getTodayCompletion(user.id),
        TodayService.getWeeklyCompletions(user.id),
        getDailyPassage(),
      ]);

      setTodayProgress(progressResult);

      if (streakResult.data) {
        setCurrentStreak(streakResult.data);
      }

      if (completionResult.data) {
        setTodayCompletion(completionResult.data);
      }

      if (weeklyResult.data) {
        setWeeklyCompletions(weeklyResult.data);
      }

      if (passage) {
        setDailyPassage(passage);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data when user changes or on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshProgress();
    } else {
      setLoading(false);
      setTodayProgress(null);
      setCurrentStreak(null);
      setTodayCompletion(null);
      setWeeklyCompletions([]);
    }
  }, [isAuthenticated, user, refreshProgress]);

  // Refresh when the app comes back to the foreground, but only if the date has changed
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && isAuthenticated && user) {
        const today = new Date().toDateString();
        if (lastActiveDate.current !== today) {
          lastActiveDate.current = today;
          refreshProgress();
        }
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, user, refreshProgress]);

  // Refresh exactly at midnight if the app is actively open and in the foreground
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = midnight.getTime() - now.getTime();

      midnightTimerRef.current = setTimeout(() => {
        const today = new Date().toDateString();
        // Guard against double-fetch if AppState already refreshed (e.g. app was backgrounded at midnight)
        if (lastActiveDate.current !== today) {
          lastActiveDate.current = today;
          refreshProgress();
        }
        // Schedule for the next midnight in case the app stays open even longer
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, [isAuthenticated, user, refreshProgress]);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const optimisticallyCompleteStage = useCallback((stage: TodayStage) => {
    setTodayProgress((prev) => {
      const next: TodayProgress = prev
        ? { ...prev }
        : {
            checkInCompleted: false,
            passageCompleted: false,
            insightCompleted: false,
            progressPercentage: 0,
          };

      if (stage === 'check_in') next.checkInCompleted = true;
      if (stage === 'passage') next.passageCompleted = true;
      if (stage === 'insight') next.insightCompleted = true;

      const stagesCompleted = [
        next.checkInCompleted,
        next.passageCompleted,
        next.insightCompleted,
      ].filter(Boolean).length;

      next.progressPercentage = Math.round((stagesCompleted / 3) * 100);
      return next;
    });
  }, []);

  const optimisticallyCompleteToday = useCallback(() => {
    // Immediately update local state to reflect today's completion
    // so screens render the correct values without waiting for the DB round-trip
    setTodayProgress({
      checkInCompleted: true,
      passageCompleted: true,
      insightCompleted: true,
      progressPercentage: 100,
    });

    // Increment streak
    setCurrentStreak((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        current_streak: prev.current_streak + 1,
        longest_streak: Math.max(prev.longest_streak, prev.current_streak + 1),
        last_completion_date: formatLocalDate(new Date()),
        total_completions: prev.total_completions + 1,
      };
    });

    // Mark today as completed in weekly view
    setWeeklyCompletions((prev) =>
      prev.map((day) => (day.isToday ? { ...day, completed: true } : day))
    );
  }, []);

  const value: TodayContextType = {
    todayProgress,
    currentStreak,
    todayCompletion,
    weeklyCompletions,
    dailyPassage,
    loading,
    refreshProgress,
    optimisticallyCompleteStage,
    optimisticallyCompleteToday,
  };

  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}

export function useToday() {
  const context = useContext(TodayContext);
  if (context === undefined) {
    throw new Error('useToday must be used within a TodayProvider');
  }
  return context;
}
