import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface PhilosophicalPassage {
  id: string;
  source_text_id: string;
  source_author: string;
  source_work: string;
  source_section: string | null;
  condensed_passage: string;
  passage_length: number;
  reflection: string | null;
  reflection_length: number | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPassageParams {
  maxLength?: number;
  filterAuthor?: string | null;
  filterWork?: string | null;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

let _dailyPassageCache: { date: string; passage: PhilosophicalPassage } | null = null;

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get a deterministic daily passage based on the current date
 * Returns the same passage for the entire day (changes at midnight)
 * Results are cached in memory so subsequent calls are instant
 */
export async function getDailyPassage(
  params: DailyPassageParams = {}
): Promise<PhilosophicalPassage | null> {
  const {
    maxLength = 500,
    filterAuthor = null,
    filterWork = null,
  } = params;

  // Return cached result if it's from today
  const today = new Date().toDateString();
  if (_dailyPassageCache?.date === today && !filterAuthor && !filterWork) {
    return _dailyPassageCache.passage;
  }

  try {
    // Get all passages matching the criteria
    let query = supabase
      .from('philosophical_passages')
      .select('*')
      .lte('passage_length', maxLength);

    if (filterAuthor) {
      query = query.eq('source_author', filterAuthor);
    }
    if (filterWork) {
      query = query.eq('source_work', filterWork);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily passage:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Use day of year as seed for deterministic selection
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const index = dayOfYear % data.length;
    const passage = data[index] as PhilosophicalPassage;

    // Cache the result (only for unfiltered default queries)
    if (!filterAuthor && !filterWork) {
      _dailyPassageCache = { date: today, passage };
    }

    return passage;
  } catch (error) {
    console.error('Error in getDailyPassage:', error);
    return null;
  }
}

/**
 * Get all passages, optionally filtered
 */
export async function getAllPassages(
  author?: string,
  work?: string
): Promise<PhilosophicalPassage[]> {
  try {
    let query = supabase
      .from('philosophical_passages')
      .select('*')
      .order('created_at', { ascending: false });

    if (author) {
      query = query.eq('source_author', author);
    }

    if (work) {
      query = query.eq('source_work', work);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching passages:', error);
      return [];
    }

    return (data as PhilosophicalPassage[]) || [];
  } catch (error) {
    console.error('Error in getAllPassages:', error);
    return [];
  }
}

/**
 * Get a specific passage by ID
 */
export async function getPassageById(
  id: string
): Promise<PhilosophicalPassage | null> {
  try {
    const { data, error } = await supabase
      .from('philosophical_passages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching passage:', error);
      return null;
    }

    return data as PhilosophicalPassage;
  } catch (error) {
    console.error('Error in getPassageById:', error);
    return null;
  }
}

/**
 * Get passages by author
 */
export async function getPassagesByAuthor(
  author: string
): Promise<PhilosophicalPassage[]> {
  return getAllPassages(author);
}

/**
 * Get passages by work
 */
export async function getPassagesByWork(
  work: string
): Promise<PhilosophicalPassage[]> {
  return getAllPassages(undefined, work);
}

/**
 * Get all unique authors who have passages
 */
export async function getPassageAuthors(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('philosophical_passages')
      .select('source_author')
      .order('source_author');

    if (error) {
      console.error('Error fetching authors:', error);
      return [];
    }

    // Get unique authors
    const authors = [...new Set(data?.map((row) => row.source_author) || [])];
    return authors;
  } catch (error) {
    console.error('Error in getPassageAuthors:', error);
    return [];
  }
}

/**
 * Get all unique works that have passages
 */
export async function getPassageWorks(
  author?: string
): Promise<Array<{ author: string; work: string }>> {
  try {
    let query = supabase
      .from('philosophical_passages')
      .select('source_author, source_work')
      .order('source_author')
      .order('source_work');

    if (author) {
      query = query.eq('source_author', author);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching works:', error);
      return [];
    }

    // Get unique author/work combinations
    const works = data || [];
    const uniqueWorks = new Map<string, { author: string; work: string }>();
    
    works.forEach((w) => {
      const key = `${w.source_author}:${w.source_work}`;
      if (!uniqueWorks.has(key)) {
        uniqueWorks.set(key, {
          author: w.source_author,
          work: w.source_work,
        });
      }
    });

    return Array.from(uniqueWorks.values());
  } catch (error) {
    console.error('Error in getPassageWorks:', error);
    return [];
  }
}

/**
 * Get statistics about passages
 */
export async function getPassageStats(): Promise<{
  total: number;
  byAuthor: Record<string, number>;
  averageLength: number;
}> {
  try {
    const { data, error } = await supabase
      .from('philosophical_passages')
      .select('source_author, passage_length');

    if (error) {
      console.error('Error fetching passage stats:', error);
      return { total: 0, byAuthor: {}, averageLength: 0 };
    }

    if (!data || data.length === 0) {
      return { total: 0, byAuthor: {}, averageLength: 0 };
    }

    const byAuthor: Record<string, number> = {};
    let totalLength = 0;

    data.forEach((passage) => {
      // Count by author
      byAuthor[passage.source_author] =
        (byAuthor[passage.source_author] || 0) + 1;
      
      // Sum lengths
      totalLength += passage.passage_length;
    });

    return {
      total: data.length,
      byAuthor,
      averageLength: Math.round(totalLength / data.length),
    };
  } catch (error) {
    console.error('Error in getPassageStats:', error);
    return { total: 0, byAuthor: {}, averageLength: 0 };
  }
}

/**
 * Search passages by text content
 */
export async function searchPassages(
  searchText: string
): Promise<PhilosophicalPassage[]> {
  try {
    const { data, error } = await supabase
      .from('philosophical_passages')
      .select('*')
      .ilike('condensed_passage', `%${searchText}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching passages:', error);
      return [];
    }

    return (data as PhilosophicalPassage[]) || [];
  } catch (error) {
    console.error('Error in searchPassages:', error);
    return [];
  }
}
