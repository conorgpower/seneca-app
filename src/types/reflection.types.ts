// ============================================================================
// REFLECTION TYPES
// ============================================================================
// Type definitions for the Community (Live Reflections) feature

export type ReflectionStatus = 'queued' | 'live' | 'completed';

export interface Reflection {
  id: string;
  user_id: string | null;
  display_name: string;
  input_text: string;
  generated_text: string;
  status: ReflectionStatus;
  queued_at: string;
  live_started_at: string | null;
  live_until: string | null;
  completed_at: string | null;
  is_fake: boolean;
  viewer_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityReflection {
  id: string;
  display_name: string;
  input_text: string;
  generated_text: string;
  status: ReflectionStatus;
  queued_at: string;
  live_started_at: string | null;
  live_until: string | null;
  completed_at: string | null;
}

export interface CommunitySnapshot {
  live: CommunityReflection | null;
  queued: CommunityReflection[];
  server_now: string;
}

export interface ReflectionStats {
  queueLength: number;
  totalToday: number;
  userReflectionCount: number;
}

export interface CreateReflectionInput {
  user_id: string;
  display_name: string;
  input_text: string;
  generated_text: string;
}

export interface GenerateReflectionResponse {
  generatedText: string;
  error: Error | null;
}
