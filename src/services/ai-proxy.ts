import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export class AIDailyLimitError extends Error {
  constructor(public limit?: number) {
    super("You've reached today's limit. Please come back tomorrow.");
    this.name = 'AIDailyLimitError';
  }
}

/**
 * Calls the deepseek-proxy edge function. The DeepSeek key lives only on the
 * server; the user's Supabase session is attached automatically.
 */
export async function callAIProxy(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ content: string }>(
    'deepseek-proxy',
    { body }
  );

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 429) {
      let limit: number | undefined;
      try {
        limit = (await error.context.json())?.limit;
      } catch {
        // ignore body parse failures
      }
      throw new AIDailyLimitError(limit);
    }
    throw error;
  }

  if (!data?.content) throw new Error('No response generated from AI');
  return data.content;
}
