/**
 * Script to condense philosophical text sections into daily passages using DeepSeek AI
 * 
 * This script:
 * 1. Fetches all sections from the philosophical_texts table
 * 2. Groups chunks by section
 * 3. Sends each section to DeepSeek to condense into a shareable passage
 * 4. Stores the condensed passages in the philosophical_passages table
 * 
 * Usage:
 *   npx ts-node scripts/condensePhilosophicalPassages.ts
 *   
 *   Or with optional filters:
 *   npx ts-node scripts/condensePhilosophicalPassages.ts --author "Marcus Aurelius"
 *   npx ts-node scripts/condensePhilosophicalPassages.ts --work "Meditations"
 *   npx ts-node scripts/condensePhilosophicalPassages.ts --test (process only 1 section)
 *   npx ts-node scripts/condensePhilosophicalPassages.ts --limit 5 (process max 5 sections)
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Configuration
const TARGET_PASSAGE_LENGTH = 300; // Target character count for condensed passages
const MAX_PASSAGE_LENGTH = 450; // Maximum acceptable length
const BATCH_DELAY_MS = 1000; // Delay between API calls to avoid rate limits

interface SectionData {
  author: string;
  work: string;
  section: string | null;
  chunks: Array<{
    id: string;
    text: string;
    chunk_index: number;
  }>;
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Condenses a philosophical text section using DeepSeek AI
 */
async function condenseSection(sectionData: SectionData): Promise<string> {
  const fullText = sectionData.chunks
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map(chunk => chunk.text)
    .join('\n\n');

  const prompt = `You are tasked with condensing a philosophical text into a meaningful daily passage.

Original text:
Author: ${sectionData.author}
Work: ${sectionData.work}
Section: ${sectionData.section || 'Various'}

Text:
${fullText}

----------------

Please condense this philosophical text into a concise, meaningful passage suitable for daily reflection. The passage should:
- Be approximately ${TARGET_PASSAGE_LENGTH} characters (${Math.floor(TARGET_PASSAGE_LENGTH / 5)} words), but no more than ${MAX_PASSAGE_LENGTH} characters
- Capture the core philosophical insight or teaching
- Be self-contained and understandable without additional context
- Maintain the author's voice and wisdom
- Be inspiring and thought-provoking for daily reflection

Do not include any attribution, just the condensed passage itself.`;

  try {
    const response = await axios.post<{
      choices: Array<{ message: { content: string } }>;
    }>(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
      }
    );

    const condensedText = response.data.choices[0].message.content.trim();
    return condensedText;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
}

/**
 * Fetch all sections from the philosophical_texts table
 */
async function fetchAllSections(
  filterAuthor?: string,
  filterWork?: string
): Promise<SectionData[]> {
  console.log('📚 Fetching sections from philosophical_texts...');

  let query = supabase
    .from('philosophical_texts')
    .select('id, author, work, section, text, chunk_index')
    .order('author')
    .order('work')
    .order('section')
    .order('chunk_index');

  if (filterAuthor) {
    query = query.eq('author', filterAuthor);
  }
  if (filterWork) {
    query = query.eq('work', filterWork);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching sections: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No sections found');
    return [];
  }

  // Group chunks by section
  const sectionsMap = new Map<string, SectionData>();

  for (const row of data) {
    const key = `${row.author}|${row.work}|${row.section || 'none'}`;

    if (!sectionsMap.has(key)) {
      sectionsMap.set(key, {
        author: row.author,
        work: row.work,
        section: row.section,
        chunks: [],
      });
    }

    sectionsMap.get(key)!.chunks.push({
      id: row.id,
      text: row.text,
      chunk_index: row.chunk_index,
    });
  }

  console.log(`✅ Found ${sectionsMap.size} sections to process\n`);
  return Array.from(sectionsMap.values());
}

/**
 * Check if a passage already exists for a given section
 */
async function passageExists(
  author: string,
  work: string,
  section: string | null
): Promise<boolean> {
  const { data, error } = await supabase
    .from('philosophical_passages')
    .select('id')
    .eq('source_author', author)
    .eq('source_work', work)
    .eq('source_section', section)
    .limit(1);

  if (error) {
    console.error('Error checking for existing passage:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Store a condensed passage in the database
 */
async function storePassage(sectionData: SectionData, condensedText: string): Promise<void> {
  // Use the first chunk's ID as the reference (typically chunk_index = 0)
  const sourceTextId = sectionData.chunks.sort((a, b) => a.chunk_index - b.chunk_index)[0].id;

  const { error } = await supabase.from('philosophical_passages').insert({
    source_text_id: sourceTextId,
    source_author: sectionData.author,
    source_work: sectionData.work,
    source_section: sectionData.section,
    condensed_passage: condensedText,
    passage_length: condensedText.length,
  });

  if (error) {
    throw new Error(`Error storing passage: ${error.message}`);
  }
}

/**
 * Main function to process all sections
 */
async function main() {
  console.log('🚀 Starting philosophical passage condensation\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let filterAuthor: string | undefined;
  let filterWork: string | undefined;
  let limit: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--author') {
      filterAuthor = args[i + 1];
      i++;
    } else if (args[i] === '--work') {
      filterWork = args[i + 1];
      i++;
    } else if (args[i] === '--test') {
      limit = 1;
    } else if (args[i] === '--limit') {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (filterAuthor) console.log(`🔍 Filtering by author: ${filterAuthor}`);
  if (filterWork) console.log(`🔍 Filtering by work: ${filterWork}`);
  if (limit) console.log(`🔍 Limiting to ${limit} section(s)\n`);

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
    process.exit(1);
  }

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ Missing DeepSeek API key');
    console.error('Please set DEEPSEEK_API_KEY in .env file');
    process.exit(1);
  }

  try {
    // Fetch all sections
    const sections = await fetchAllSections(filterAuthor, filterWork);

    if (sections.length === 0) {
      console.log('✅ No sections to process');
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let attemptCount = 0;

    // Process each section
    for (let i = 0; i < sections.length; i++) {
      // Check if we've hit the limit
      if (limit && attemptCount >= limit) {
        console.log(`\n⏹️  Reached limit of ${limit} section(s), stopping...`);
        break;
      }

      const section = sections[i];
      const sectionLabel = `${section.author} - ${section.work}${
        section.section ? ` - ${section.section}` : ''
      }`;

      console.log(`\n[${i + 1}/${sections.length}] Processing: ${sectionLabel}`);

      // Check if passage already exists
      const exists = await passageExists(section.author, section.work, section.section);
      
      if (exists) {
        console.log('⏭️  Passage already exists, skipping...');
        skippedCount++;
        continue;
      }

      // Count this as an attempt
      attemptCount++;

      try {
        // Condense the section
        console.log('🤖 Condensing with DeepSeek...');
        const condensedText = await condenseSection(section);
        console.log(`📝 Condensed (${condensedText.length} chars): ${condensedText.substring(0, 100)}...`);

        // Store in database
        console.log('💾 Storing in database...');
        await storePassage(section, condensedText);
        console.log('✅ Stored successfully');

        processedCount++;

        // Rate limiting delay
        if (i < sections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      } catch (error) {
        console.error('❌ Error processing section:', error);
        errorCount++;
        // Continue with next section
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`✅ Processed: ${processedCount}`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📚 Total sections: ${sections.length}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
