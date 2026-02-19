import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface TableOfContentsSection {
  section: string;
  chunk_count: number;
  first_text_preview: string;
}

export interface SectionContent {
  id: string;
  text: string;
  chunk_index: number;
}

export interface DatabaseBook {
  author: string;
  work: string;
}

function isSentenceEnd(text: string): boolean {
  return /[.!?]["')\]]?$/.test(text);
}

/**
 * Clean OCR/scraped hard line breaks while preserving paragraph and sentence breaks.
 */
function normalizeSectionText(rawText: string): string {
  const normalizedNewlines = rawText.replace(/\r\n?/g, '\n');
  const lines = normalizedNewlines.split('\n');
  const parts: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Preserve paragraph boundaries from blank lines.
    if (!trimmed) {
      if (parts.length > 0 && parts[parts.length - 1] !== '\n\n') {
        parts.push('\n\n');
      }
      return;
    }

    if (parts.length === 0 || parts[parts.length - 1] === '\n\n') {
      parts.push(trimmed);
      return;
    }

    const previous = parts[parts.length - 1];
    const joiner = previous.endsWith('-')
      ? ''
      : isSentenceEnd(previous)
        ? '\n'
        : ' ';

    parts[parts.length - 1] = `${previous}${joiner}${trimmed}`;
  });

  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

/**
 * Get all unique author/work combinations in the database
 * Useful for debugging metadata mismatches
 */
export async function getAvailableBooks(): Promise<DatabaseBook[]> {
  // Use RPC to get distinct values directly from PostgreSQL
  const { data, error } = await supabase.rpc('get_distinct_works');

  if (error) {
    console.error('Error fetching available books:', error);
    // Fallback to manual deduplication with higher limit
    const fallbackResult = await supabase
      .from('philosophical_texts')
      .select('author, work')
      .limit(10000);
    
    if (fallbackResult.error) {
      return [];
    }

    const uniqueBooks = new Map<string, DatabaseBook>();
    fallbackResult.data?.forEach((row) => {
      const key = `${row.author}:${row.work}`;
      if (!uniqueBooks.has(key)) {
        uniqueBooks.set(key, { author: row.author, work: row.work });
      }
    });

    const books = Array.from(uniqueBooks.values());
    console.log('📚 Books in database (fallback):', books);
    return books;
  }

  console.log('📚 Books in database:', data);
  return data || [];
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

/**
 * Get table of contents for a work
 */
export async function getTableOfContents(
  workTitle: string,
  workAuthor: string
): Promise<TableOfContentsSection[]> {
  console.log('Fetching TOC for:', { workTitle, workAuthor });
  
  const { data, error } = await supabase
    .from('philosophical_texts')
    .select('section, text, chunk_index')
    .eq('work', workTitle)
    .eq('author', workAuthor)
    .order('chunk_index', { ascending: true });

  if (error) {
    console.error('Error fetching table of contents:', error);
    throw error;
  }

  console.log('TOC raw data count:', data?.length || 0);

  if (!data || data.length === 0) {
    console.warn('No data found for work:', { workTitle, workAuthor });
    return [];
  }

  // Group by section (handle null sections)
  const sectionsMap = new Map<string, { texts: string[]; minIndex: number }>();
  
  data.forEach((row) => {
    const sectionName = row.section || 'Untitled Section';
    if (!sectionsMap.has(sectionName)) {
      sectionsMap.set(sectionName, { texts: [], minIndex: row.chunk_index });
    }
    const section = sectionsMap.get(sectionName)!;
    section.texts.push(row.text);
    section.minIndex = Math.min(section.minIndex, row.chunk_index);
  });

  // Convert to array and sort by first chunk index
  const toc: TableOfContentsSection[] = Array.from(sectionsMap.entries())
    .map(([section, data]) => ({
      section,
      chunk_count: data.texts.length,
      first_text_preview: data.texts[0] || '',
    }))
    .sort((a, b) => {
      const aIndex = sectionsMap.get(a.section)!.minIndex;
      const bIndex = sectionsMap.get(b.section)!.minIndex;
      return aIndex - bIndex;
    });

  console.log('TOC sections found:', toc.length, toc.map(t => t.section).slice(0, 5));
  return toc;
}

// ============================================================================
// READING CONTENT
// ============================================================================

/**
 * Get the full text content for a specific section/chapter
 */
export async function getSectionContent(
  workTitle: string,
  workAuthor: string,
  sectionName: string
): Promise<SectionContent[]> {
  console.log('Fetching section content:', { workTitle, workAuthor, sectionName });
  
  const { data, error } = await supabase
    .from('philosophical_texts')
    .select('id, text, chunk_index')
    .eq('work', workTitle)
    .eq('author', workAuthor)
    .eq('section', sectionName)
    .order('chunk_index', { ascending: true });

  if (error) {
    console.error('Error fetching section content:', error);
    throw error;
  }

  console.log('Section content chunks found:', data?.length || 0);
  return data || [];
}

/**
 * Get the complete text of a section as a single string
 */
export async function getSectionText(
  workTitle: string,
  workAuthor: string,
  sectionName: string
): Promise<string> {
  const content = await getSectionContent(workTitle, workAuthor, sectionName);
  const rawText = content.map((chunk) => chunk.text).join('\n\n');
  return normalizeSectionText(rawText);
}
