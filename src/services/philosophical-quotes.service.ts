import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface PhilosophicalQuote {
  id: string;
  quote_text: string;
  author: string;
  source_url: string | null;
  quote_hash: string;
  created_at: string;
  updated_at: string;
}

export interface DailyQuoteParams {
  filterAuthor?: string | null;
  maxQuoteLength?: number | null;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

function getDayOfYearSeed(): number {
  const now = new Date();
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
}

async function getDeterministicDailyQuote(
  params: DailyQuoteParams = {}
): Promise<PhilosophicalQuote | null> {
  const { filterAuthor = null, maxQuoteLength = null } = params;

  try {
    let query = supabase
      .from('philosophical_quotes')
      .select('*');

    if (filterAuthor) {
      query = query.eq('author', filterAuthor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily quote:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const filteredData = maxQuoteLength && maxQuoteLength > 0
      ? data.filter((quote) => {
          const quoteText = (quote?.quote_text || '').trim();
          return quoteText.length > 0 && quoteText.length <= maxQuoteLength;
        })
      : data;

    if (filteredData.length === 0) {
      return null;
    }

    const dayOfYear = getDayOfYearSeed();
    const index = dayOfYear % filteredData.length;
    return filteredData[index] as PhilosophicalQuote;
  } catch (error) {
    console.error('Error in getDeterministicDailyQuote:', error);
    return null;
  }
}

/**
 * Get a deterministic daily quote based on the current date
 * Returns the same quote for the entire day (changes at midnight)
 */
export async function getDailyQuote(
  params: DailyQuoteParams = {}
): Promise<PhilosophicalQuote | null> {
  return getDeterministicDailyQuote(params);
}

/**
 * Get a deterministic daily quote specifically for widgets.
 * Widget quotes are selected only from quotes up to `maxQuoteLength`.
 */
export async function getDailyWidgetQuote(
  maxQuoteLength = 80,
  params: Omit<DailyQuoteParams, 'maxQuoteLength'> = {}
): Promise<PhilosophicalQuote | null> {
  return getDeterministicDailyQuote({
    ...params,
    maxQuoteLength,
  });
}

/**
 * Get all quotes, optionally filtered by author
 */
export async function getAllQuotes(
  author?: string
): Promise<PhilosophicalQuote[]> {
  try {
    let query = supabase
      .from('philosophical_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (author) {
      query = query.eq('author', author);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return [];
    }

    return (data as PhilosophicalQuote[]) || [];
  } catch (error) {
    console.error('Error in getAllQuotes:', error);
    return [];
  }
}

/**
 * Get a random quote
 */
export async function getRandomQuote(
  author?: string
): Promise<PhilosophicalQuote | null> {
  try {
    let query = supabase
      .from('philosophical_quotes')
      .select('*');

    if (author) {
      query = query.eq('author', author);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching random quote:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get a random index
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as PhilosophicalQuote;
  } catch (error) {
    console.error('Error in getRandomQuote:', error);
    return null;
  }
}

/**
 * Search quotes by text content
 */
export async function searchQuotes(
  searchTerm: string
): Promise<PhilosophicalQuote[]> {
  try {
    const { data, error } = await supabase
      .from('philosophical_quotes')
      .select('*')
      .textSearch('quote_text', searchTerm);

    if (error) {
      console.error('Error searching quotes:', error);
      return [];
    }

    return (data as PhilosophicalQuote[]) || [];
  } catch (error) {
    console.error('Error in searchQuotes:', error);
    return [];
  }
}
