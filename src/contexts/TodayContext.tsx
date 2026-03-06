import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as TodayService from '../services/today.service';
import { getDailyPassage } from '../services/philosophical-passages.service';
import type { PhilosophicalPassage } from '../services/philosophical-passages.service';
import { getDailyQuote } from '../services/philosophical-quotes.service';
import type { PhilosophicalQuote } from '../services/philosophical-quotes.service';
import type {
  DailyCompletion,
  UserStreak,
  TodayProgress,
  WeeklyCompletion,
} from '../types/today.types';

const CACHE_KEY_QUOTE = '@seneca_cached_daily_quote';
const CACHE_KEY_PROGRESS = '@seneca_cached_today_progress';
const CACHE_KEY_STREAK = '@seneca_cached_streak';
const CACHE_KEY_WEEKLY = '@seneca_cached_weekly';

type TodayStage = 'check_in' | 'passage' | 'insight';

interface TodayContextType {
  todayProgress: TodayProgress | null;
  currentStreak: UserStreak | null;
  todayCompletion: DailyCompletion | null;
  weeklyCompletions: WeeklyCompletion[];
  dailyPassage: PhilosophicalPassage | null;
  dailyQuote: PhilosophicalQuote | null;
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
  const [dailyQuote, setDailyQuote] = useState<PhilosophicalQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActiveDate = useRef<string>(new Date().toDateString());
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getLocalDateStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Load cached data from AsyncStorage on mount for instant UI
  useEffect(() => {
    const loadCache = async () => {
      try {
        const today = getLocalDateStr();
        const [cachedQuoteRaw, cachedProgressRaw, cachedStreakRaw, cachedWeeklyRaw] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY_QUOTE),
          AsyncStorage.getItem(CACHE_KEY_PROGRESS),
          AsyncStorage.getItem(CACHE_KEY_STREAK),
          AsyncStorage.getItem(CACHE_KEY_WEEKLY),
        ]);

        if (cachedQuoteRaw) {
          const cached = JSON.parse(cachedQuoteRaw);
          if (cached.date === today && cached.data) {
            setDailyQuote(cached.data);
          }
        }

        if (cachedProgressRaw) {
          const cached = JSON.parse(cachedProgressRaw);
          if (cached.date === today && cached.data) {
            setTodayProgress(cached.data);
          }
        }

        if (cachedStreakRaw) {
          const cached = JSON.parse(cachedStreakRaw);
          if (cached.date === today && cached.data) {
            setCurrentStreak(cached.data);
          }
        }

        if (cachedWeeklyRaw) {
          const cached = JSON.parse(cachedWeeklyRaw);
          if (cached.date === today && cached.data) {
            setWeeklyCompletions(cached.data);
          }
        }
      } catch {
        // Cache read failure is non-critical
      }
    };
    loadCache();
  }, []);

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
      const [progressResult, streakResult, completionResult, weeklyResult, passage, quote] = await Promise.all([
        TodayService.getTodayProgress(user.id),
        TodayService.getUserStreak(user.id),
        TodayService.getTodayCompletion(user.id),
        TodayService.getWeeklyCompletions(user.id),
        getDailyPassage(),
        getDailyQuote(),
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

      if (quote) {
        setDailyQuote(quote);
      }

      // Persist to AsyncStorage for instant load on next cold start
      const today = getLocalDateStr();
      try {
        const cacheOps: Promise<void>[] = [];
        if (quote) {
          cacheOps.push(AsyncStorage.setItem(CACHE_KEY_QUOTE, JSON.stringify({ date: today, data: quote })));
        }
        if (progressResult) {
          cacheOps.push(AsyncStorage.setItem(CACHE_KEY_PROGRESS, JSON.stringify({ date: today, data: progressResult })));
        }
        if (streakResult.data) {
          cacheOps.push(AsyncStorage.setItem(CACHE_KEY_STREAK, JSON.stringify({ date: today, data: streakResult.data })));
        }
        if (weeklyResult.data) {
          cacheOps.push(AsyncStorage.setItem(CACHE_KEY_WEEKLY, JSON.stringify({ date: today, data: weeklyResult.data })));
        }
        await Promise.all(cacheOps);
      } catch {
        // Cache write failure is non-critical
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
    dailyQuote,
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
