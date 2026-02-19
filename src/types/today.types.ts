// ============================================================================
// TODAY'S JOURNEY TYPES
// ============================================================================

/**
 * Daily check-in record (Stage 1)
 * Captures user's mood/state on a 0-100 scale
 */
export interface DailyCheckIn {
  id: string;
  user_id: string;
  check_in_date: string; // ISO date string (YYYY-MM-DD)
  mood_value: number; // 0-100
  created_at: string;
}

/**
 * Daily completion record
 * Tracks progress through all 3 stages for a given day
 */
export interface DailyCompletion {
  id: string;
  user_id: string;
  completion_date: string; // ISO date string (YYYY-MM-DD)

  // Stage 1: Check-in
  check_in_completed: boolean;
  check_in_value: number | null;

  // Stage 2: Passage
  passage_completed: boolean;
  passage_id: string | null;

  // Stage 3: Insight
  insight_completed: boolean;

  // Overall completion
  all_stages_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User streak data
 * Tracks consecutive days and milestones
 */
export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completion_date: string | null; // ISO date string (YYYY-MM-DD)
  total_completions: number;
  created_at: string;
  updated_at: string;
}

/**
 * Daily reminder configuration
 * Stores user's notification preferences
 */
export interface DailyReminder {
  user_id: string;
  enabled: boolean;
  reminder_time: string; // HH:MM:SS format
  timezone: string | null;
  days_of_week: number[]; // 1=Monday, 7=Sunday
  created_at: string;
  updated_at: string;
}

/**
 * Today's progress summary
 * Calculated state for UI display
 */
export interface TodayProgress {
  checkInCompleted: boolean;
  passageCompleted: boolean;
  insightCompleted: boolean;
  progressPercentage: number; // 0, 33, 66, or 100
}

/**
 * Completion status for weekly view
 * Used to display streak dots (Mon-Sun)
 */
export interface WeeklyCompletion {
  date: string; // ISO date string
  completed: boolean;
  isToday: boolean;
}
