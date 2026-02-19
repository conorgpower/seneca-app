import { supabase } from './supabase';
import type {
  DailyCheckIn,
  DailyCompletion,
  UserStreak,
  DailyReminder,
  TodayProgress,
  WeeklyCompletion,
} from '../types/today.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a Date as YYYY-MM-DD using local timezone (not UTC)
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
function getTodayDate(): string {
  return formatLocalDate(new Date());
}

/**
 * Get dates for the current week (Monday to Sunday)
 */
function getWeekDates(): string[] {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(formatLocalDate(date));
  }

  return weekDates;
}

// ============================================================================
// DAILY CHECK-INS (Stage 1)
// ============================================================================

/**
 * Submit or update a check-in for today
 */
export async function submitCheckIn(
  userId: string,
  moodValue: number
): Promise<{ data: DailyCheckIn | null; error: Error | null }> {
  try {
    const today = getTodayDate();

    // Upsert check-in (replace if exists for today)
    const { data, error } = await supabase
      .from('daily_check_ins')
      .upsert(
        {
          user_id: userId,
          check_in_date: today,
          mood_value: moodValue,
        },
        { onConflict: 'user_id,check_in_date' }
      )
      .select()
      .single();

    if (error) throw error;

    // Update completion record
    await updateStageCompletion(userId, 'check_in', { check_in_value: moodValue });

    return { data: data as DailyCheckIn, error: null };
  } catch (error) {
    console.error('Error submitting check-in:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to submit check-in'),
    };
  }
}

/**
 * Get today's check-in
 */
export async function getTodayCheckIn(
  userId: string
): Promise<{ data: DailyCheckIn | null; error: Error | null }> {
  try {
    const today = getTodayDate();

    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (error) throw error;

    return { data: data as DailyCheckIn | null, error: null };
  } catch (error) {
    console.error('Error fetching today check-in:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch check-in'),
    };
  }
}

// ============================================================================
// DAILY COMPLETIONS (Tracks all 3 stages)
// ============================================================================

/**
 * Get or create today's completion record
 */
export async function getTodayCompletion(
  userId: string
): Promise<{ data: DailyCompletion | null; error: Error | null }> {
  try {
    const today = getTodayDate();

    // First try to fetch existing record
    const { data: existing, error: fetchError } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('completion_date', today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return { data: existing as DailyCompletion, error: null };

    // No record exists — create one using upsert to handle race conditions
    const { data, error } = await supabase
      .from('daily_completions')
      .upsert(
        {
          user_id: userId,
          completion_date: today,
        },
        { onConflict: 'user_id,completion_date' }
      )
      .select()
      .single();

    if (error) throw error;

    return { data: data as DailyCompletion, error: null };
  } catch (error) {
    console.error('Error fetching today completion:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch completion'),
    };
  }
}

/**
 * Internal: Update a specific stage's completion
 */
async function updateStageCompletion(
  userId: string,
  stage: 'check_in' | 'passage' | 'insight',
  extraData?: Record<string, any>
): Promise<{ error: Error | null }> {
  try {
    const today = getTodayDate();

    // Build update object
    const updates: Record<string, any> = {
      [`${stage}_completed`]: true,
      ...extraData,
    };

    // Check if all stages are now complete
    const { data: currentCompletion } = await getTodayCompletion(userId);

    if (currentCompletion) {
      const allComplete =
        (stage === 'check_in' || currentCompletion.check_in_completed) &&
        (stage === 'passage' || currentCompletion.passage_completed) &&
        (stage === 'insight' || currentCompletion.insight_completed);

      if (allComplete) {
        updates.all_stages_completed = true;
        updates.completed_at = new Date().toISOString();
      }
    }

    // Update completion
    const { error } = await supabase
      .from('daily_completions')
      .upsert(
        {
          user_id: userId,
          completion_date: today,
          ...updates,
        },
        { onConflict: 'user_id,completion_date' }
      );

    if (error) throw error;

    // If all stages complete, update streak
    if (updates.all_stages_completed) {
      await supabase.rpc('update_user_streak', {
        p_user_id: userId,
        p_completion_date: today,
      });
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating stage completion:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to update completion'),
    };
  }
}

/**
 * Mark passage (Stage 2) as complete
 */
export async function markPassageComplete(
  userId: string,
  passageId: string
): Promise<{ error: Error | null }> {
  return updateStageCompletion(userId, 'passage', { passage_id: passageId });
}

/**
 * Mark insight (Stage 3) as complete
 */
export async function markInsightComplete(
  userId: string
): Promise<{ error: Error | null }> {
  return updateStageCompletion(userId, 'insight');
}

/**
 * Get today's progress summary for UI display
 */
export async function getTodayProgress(userId: string): Promise<TodayProgress> {
  const { data } = await getTodayCompletion(userId);

  if (!data) {
    return {
      checkInCompleted: false,
      passageCompleted: false,
      insightCompleted: false,
      progressPercentage: 0,
    };
  }

  const stagesCompleted = [
    data.check_in_completed,
    data.passage_completed,
    data.insight_completed,
  ].filter(Boolean).length;

  return {
    checkInCompleted: data.check_in_completed,
    passageCompleted: data.passage_completed,
    insightCompleted: data.insight_completed,
    progressPercentage: Math.round((stagesCompleted / 3) * 100),
  };
}

/**
 * Get completions for the current week (for weekly dots display)
 */
export async function getWeeklyCompletions(
  userId: string
): Promise<{ data: WeeklyCompletion[]; error: Error | null }> {
  try {
    const weekDates = getWeekDates();
    const today = getTodayDate();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    const { data, error } = await supabase
      .from('daily_completions')
      .select('completion_date, all_stages_completed')
      .eq('user_id', userId)
      .gte('completion_date', startDate)
      .lte('completion_date', endDate);

    if (error) throw error;

    // Map data to weekly completion objects
    const completionsMap = new Map(
      (data || []).map(item => [item.completion_date, item.all_stages_completed])
    );

    const weeklyCompletions: WeeklyCompletion[] = weekDates.map(date => ({
      date,
      completed: completionsMap.get(date) || false,
      isToday: date === today,
    }));

    return { data: weeklyCompletions, error: null };
  } catch (error) {
    console.error('Error fetching weekly completions:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch weekly completions'),
    };
  }
}

/**
 * Get completed days (all stages) for a given month
 * Returns an array of day numbers (1–31) that were fully completed
 */
export async function getMonthCompletions(
  userId: string,
  year: number,
  month: number // 0-indexed (0=Jan, 11=Dec)
): Promise<{ data: number[]; error: Error | null }> {
  try {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('daily_completions')
      .select('completion_date')
      .eq('user_id', userId)
      .eq('all_stages_completed', true)
      .gte('completion_date', startDate)
      .lte('completion_date', endDate);

    if (error) throw error;

    const days = (data || []).map(d => parseInt(d.completion_date.split('-')[2], 10));
    return { data: days, error: null };
  } catch (error) {
    console.error('Error fetching month completions:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch month completions'),
    };
  }
}

// ============================================================================
// USER STREAKS
// ============================================================================

/**
 * Get user's streak data
 */
export async function getUserStreak(
  userId: string
): Promise<{ data: UserStreak | null; error: Error | null }> {
  try {
    const today = getTodayDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatLocalDate(yesterdayDate);
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_streak_active', {
      p_user_id: userId,
      p_today: today,
    });

    const normalizedRpcData = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (!rpcError && normalizedRpcData) {
      return { data: normalizedRpcData as UserStreak, error: null };
    }

    // Fallback for environments where the migration has not been applied yet.
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // If no streak record, return default
    if (!data) {
      return {
        data: {
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_completion_date: null,
          total_completions: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    const streakData = data as UserStreak;
    const shouldResetStreak =
      !!streakData.last_completion_date &&
      streakData.last_completion_date !== today &&
      streakData.last_completion_date !== yesterday;

    // Keep UI behavior correct even before server migration is applied.
    if (shouldResetStreak && streakData.current_streak > 0) {
      return {
        data: {
          ...streakData,
          current_streak: 0,
        },
        error: null,
      };
    }

    return { data: streakData, error: null };
  } catch (error) {
    console.error('Error fetching user streak:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch streak'),
    };
  }
}

// ============================================================================
// DAILY REMINDERS
// ============================================================================

/**
 * Get user's reminder configuration
 */
export async function getUserReminder(
  userId: string
): Promise<{ data: DailyReminder | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('daily_reminders')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return { data: data as DailyReminder | null, error: null };
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch reminder'),
    };
  }
}

/**
 * Save or update reminder configuration
 */
export async function saveReminder(
  userId: string,
  reminderData: Partial<DailyReminder>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('daily_reminders')
      .upsert(
        {
          user_id: userId,
          ...reminderData,
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error saving reminder:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to save reminder'),
    };
  }
}

/**
 * Delete reminder configuration
 */
export async function deleteReminder(
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('daily_reminders')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to delete reminder'),
    };
  }
}
