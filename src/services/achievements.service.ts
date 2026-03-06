import { supabase } from './supabase';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

/**
 * Get all unlocked achievements for a user
 */
export async function getUserAchievements(
  userId: string
): Promise<{ data: UserAchievement[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return { data: (data as UserAchievement[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch achievements'),
    };
  }
}

/**
 * Log content access (for content-based achievements).
 * Uses upsert so duplicate calls are safe.
 */
export async function logContentAccess(
  userId: string,
  contentType: 'audio_lesson' | 'breathwork' | 'comic' | 'book',
  contentId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_content_log')
      .upsert(
        {
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
        },
        { onConflict: 'user_id,content_type,content_id' }
      );

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error logging content access:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to log content'),
    };
  }
}

/**
 * Check and award achievements for a given category.
 * Returns array of newly unlocked achievement IDs.
 */
export async function checkAchievements(
  userId: string,
  category: 'streak' | 'content' | 'community' | 'chat' | 'focus' | 'checkin'
): Promise<{ data: string[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_achievements', {
      p_user_id: userId,
      p_category: category,
    });

    if (error) throw error;
    return { data: (data as string[]) || [], error: null };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to check achievements'),
    };
  }
}
