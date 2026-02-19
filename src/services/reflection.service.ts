// ============================================================================
// REFLECTION SERVICE
// ============================================================================
// CRUD operations for reflections in the Community feature
// Pattern follows user-profile.service.ts

import { supabase } from './supabase';
import type {
  Reflection,
  CommunityReflection,
  CommunitySnapshot,
  ReflectionStats,
  CreateReflectionInput,
} from '../types/reflection.types';

const COMMUNITY_COLUMNS = `
  id,
  display_name,
  input_text,
  generated_text,
  status,
  queued_at,
  live_started_at,
  live_until,
  completed_at
`;

/**
 * Submit a new reflection (user-generated)
 */
export async function submitReflection(
  input: CreateReflectionInput
): Promise<{ data: Reflection | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .insert({
        user_id: input.user_id,
        display_name: input.display_name,
        input_text: input.input_text,
        generated_text: input.generated_text,
        status: 'queued',
        is_fake: false,
      })
      .select()
      .single();

    if (error) throw error;

    return { data: data as Reflection, error: null };
  } catch (error) {
    console.error('Error submitting reflection:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to submit reflection'),
    };
  }
}

/**
 * Get the current live reflection
 */
export async function getLiveReflection(): Promise<{
  data: CommunityReflection | null;
  error: Error | null;
}> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('reflections')
      .select(COMMUNITY_COLUMNS)
      .eq('status', 'live')
      .gt('live_until', nowIso)
      .order('live_started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { data: data as CommunityReflection | null, error: null };
  } catch (error) {
    console.error('Error fetching live reflection:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch live reflection'),
    };
  }
}

/**
 * Get queued reflections (next in line)
 */
export async function getQueuedReflections(
  limit: number = 10
): Promise<{ data: CommunityReflection[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select(COMMUNITY_COLUMNS)
      .eq('status', 'queued')
      .order('queued_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return { data: (data as CommunityReflection[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching queued reflections:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch queued reflections'),
    };
  }
}

/**
 * Get a consistent live + queue snapshot in one DB call
 */
export async function getCommunitySnapshot(
  queueLimit: number = 10
): Promise<{ data: CommunitySnapshot | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_community_reflection_snapshot', {
      queue_limit: queueLimit,
    });

    if (error) throw error;

    return { data: data as CommunitySnapshot, error: null };
  } catch (error) {
    console.error('Error fetching community snapshot:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch community snapshot'),
    };
  }
}

/**
 * Ask the backend to immediately run reflection rotation logic.
 * Safe to call even if no changes are needed.
 */
export async function requestReflectionRotation(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('request_reflection_rotation');
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error requesting reflection rotation:', error);
    return {
      error:
        error instanceof Error ? error : new Error('Failed to request reflection rotation'),
    };
  }
}

/**
 * Get user's reflection history
 */
export async function getUserReflections(
  userId: string,
  limit: number = 50
): Promise<{ data: Reflection[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: (data as Reflection[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching user reflections:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch user reflections'),
    };
  }
}

/**
 * Get user's reflections filtered by status
 */
export async function getUserReflectionsByStatus(
  userId: string,
  status: 'queued' | 'live' | 'completed',
  limit: number = 50
): Promise<{ data: Reflection[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: (data as Reflection[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching user reflections by status:', error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error
          : new Error('Failed to fetch user reflections by status'),
    };
  }
}

/**
 * Get a specific reflection by ID
 */
export async function getReflectionById(
  reflectionId: string
): Promise<{ data: Reflection | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('id', reflectionId)
      .single();

    if (error) throw error;

    return { data: data as Reflection, error: null };
  } catch (error) {
    console.error('Error fetching reflection by ID:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch reflection'),
    };
  }
}

/**
 * Get reflection statistics
 */
export async function getReflectionStats(
  userId?: string
): Promise<{ data: ReflectionStats | null; error: Error | null }> {
  try {
    // Get queue length
    const { count: queueLength, error: queueError } = await supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (queueError) throw queueError;

    // Get total reflections today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: totalToday, error: todayError } = await supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) throw todayError;

    // Get user's reflection count (if userId provided)
    let userReflectionCount = 0;
    if (userId) {
      const { count: userCount, error: userError } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (userError) throw userError;
      userReflectionCount = userCount || 0;
    }

    return {
      data: {
        queueLength: queueLength || 0,
        totalToday: totalToday || 0,
        userReflectionCount,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching reflection stats:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch reflection stats'),
    };
  }
}

/**
 * Delete a reflection (user can delete their own)
 */
export async function deleteReflection(
  reflectionId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('reflections')
      .delete()
      .eq('id', reflectionId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting reflection:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to delete reflection'),
    };
  }
}
