// ============================================================================
// REFLECTION REALTIME SERVICE
// ============================================================================
// Supabase Realtime subscriptions for live reflection updates

import { supabase } from './supabase';
import type { Reflection, CommunityReflection } from '../types/reflection.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
 * Subscribe to live reflection changes
 * Triggers callback when the live reflection changes
 */
export function subscribeLiveReflection(
  callback: (reflection: Reflection | null) => void
): RealtimeChannel {
  const channel = supabase
    .channel('live-reflection-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'reflections',
        filter: 'status=eq.live',
      },
      (payload) => {
        console.log('Live reflection change:', payload);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as Reflection);
        } else if (payload.eventType === 'DELETE') {
          callback(null);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to queued reflections changes
 * Triggers callback when queue changes (new reflections added, promoted, etc.)
 */
export function subscribeQueuedReflections(
  callback: (reflections: CommunityReflection[]) => void,
  limit: number = 10
): RealtimeChannel {
  // Subscribe to all changes on reflections table
  const channel = supabase
    .channel('queued-reflections-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reflections',
      },
      async () => {
        // Refetch queued reflections when any change occurs
        try {
          const { data, error } = await supabase
            .from('reflections')
            .select(COMMUNITY_COLUMNS)
            .eq('status', 'queued')
            .order('queued_at', { ascending: true })
            .limit(limit);

          if (error) {
            console.error('Error fetching queued reflections:', error);
            return;
          }

          callback((data as CommunityReflection[]) || []);
        } catch (error) {
          console.error('Error in queued reflections callback:', error);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to changes for a specific reflection
 * Useful for the LiveReflectionDetail screen
 */
export function subscribeToReflection(
  reflectionId: string,
  callback: (reflection: Reflection | null) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`reflection-${reflectionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reflections',
        filter: `id=eq.${reflectionId}`,
      },
      (payload) => {
        console.log('Reflection change:', payload);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as Reflection);
        } else if (payload.eventType === 'DELETE') {
          callback(null);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to user's reflection changes
 * Useful for the MyReflections screen
 */
export function subscribeUserReflections(
  userId: string,
  callback: (reflections: Reflection[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`user-reflections-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reflections',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // Refetch user's reflections
        try {
          const { data, error } = await supabase
            .from('reflections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            console.error('Error fetching user reflections:', error);
            return;
          }

          callback((data as Reflection[]) || []);
        } catch (error) {
          console.error('Error in user reflections callback:', error);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  try {
    await supabase.removeChannel(channel);
  } catch (error) {
    console.error('Error unsubscribing channel:', error);
  }
}

/**
 * Unsubscribe from all channels
 * Useful for cleanup on app unmount or logout
 */
export async function unsubscribeAll(): Promise<void> {
  try {
    await supabase.removeAllChannels();
  } catch (error) {
    console.error('Error unsubscribing all channels:', error);
  }
}
