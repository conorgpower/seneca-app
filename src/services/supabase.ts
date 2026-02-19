import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Search for philosophical texts similar to a query
 */
export async function searchPhilosophicalTexts(
  queryEmbedding: number[],
  options?: {
    matchThreshold?: number;
    matchCount?: number;
    author?: string;
    work?: string;
  }
) {
  const { data, error } = await supabase.rpc('match_philosophical_texts', {
    query_embedding: queryEmbedding,
    match_threshold: options?.matchThreshold ?? 0.7,
    match_count: options?.matchCount ?? 10,
    filter_author: options?.author ?? null,
    filter_work: options?.work ?? null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get a random philosophical quote
 */
export async function getRandomQuote(author?: string) {
  let query = supabase
    .from('philosophical_texts')
    .select('*')
    .gte('text', 50) // Ensure decent length
    .limit(100);

  if (author) {
    query = query.eq('author', author);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Return random quote from results
  return data[Math.floor(Math.random() * data.length)];
}

/**
 * Get all unique authors
 */
export async function getAuthors() {
  const { data, error } = await supabase
    .from('philosophical_texts')
    .select('author')
    .limit(1000);

  if (error) throw error;

  // Get unique authors
  const uniqueAuthors = [...new Set(data?.map((row) => row.author))];
  return uniqueAuthors;
}

/**
 * Get all works by an author
 */
export async function getWorksByAuthor(author: string) {
  const { data, error } = await supabase
    .from('philosophical_texts')
    .select('work')
    .eq('author', author)
    .limit(1000);

  if (error) throw error;

  // Get unique works
  const uniqueWorks = [...new Set(data?.map((row) => row.work))];
  return uniqueWorks;
}

/**
 * Get a random philosophical text section
 */
export async function getRandomTextSection(options?: {
  author?: string;
  work?: string;
}) {
  let query = supabase
    .from('philosophical_texts')
    .select('*')
    .order('id', { ascending: false })
    .limit(100);

  if (options?.author) {
    query = query.eq('author', options.author);
  }

  if (options?.work) {
    query = query.eq('work', options.work);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Return random section from results
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

/**
 * Get daily philosophical passage (deterministic based on date)
 */
export async function getDailyPassage(date: Date = new Date()) {
  const { data, error } = await supabase
    .from('philosophical_texts')
    .select('*')
    .order('id', { ascending: true })
    .limit(1000);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Use date as seed for deterministic selection
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % data.length;

  return data[index];
}
