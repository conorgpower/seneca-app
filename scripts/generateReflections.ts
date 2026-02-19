/**
 * Script to generate reflections for philosophical passages using DeepSeek AI
 *
 * This script:
 * 1. Fetches all passages from the philosophical_passages table
 * 2. For each passage without a reflection, generates one using DeepSeek
 * 3. The reflection helps break down the passage, explain it, and suggest applications
 * 4. Each reflection is approximately twice as long as its passage
 * 5. Stores the reflection back in the database
 *
 * Usage:
 *   npx ts-node scripts/generateReflections.ts
 *
 *   Or with optional filters:
 *   npx ts-node scripts/generateReflections.ts --author "Marcus Aurelius"
 *   npx ts-node scripts/generateReflections.ts --work "Meditations"
 *   npx ts-node scripts/generateReflections.ts --test (process only 1 passage)
 *   npx ts-node scripts/generateReflections.ts --limit 5 (process max 5 passages)
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
const BATCH_DELAY_MS = 1000; // Delay between API calls to avoid rate limits

interface PassageData {
  id: string;
  source_author: string;
  source_work: string;
  source_section: string | null;
  condensed_passage: string;
  passage_length: number;
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generates a reflection for a philosophical passage using DeepSeek AI
 */
async function generateReflection(passage: PassageData): Promise<string> {
  // Target reflection length should be approximately twice the passage length
  const targetLength = passage.passage_length * 2;
  const targetWords = Math.floor(targetLength / 5); // Rough estimate of words

  const prompt = `You are a thoughtful philosophy teacher helping someone understand and apply Stoic wisdom to their daily life.

Philosophical passage:
Author: ${passage.source_author}
Work: ${passage.source_work}
${passage.source_section ? `Section: ${passage.source_section}` : ''}

Passage:
${passage.condensed_passage}

----------------

Please write a reflection on this passage that helps the reader:
1. Break down and understand the key ideas
2. Grasp the deeper meaning and context
3. See how they could apply this wisdom to their own life

Your reflection should be:
- Approximately ${targetWords} words (about ${targetLength} characters) - roughly twice the length of the passage
- Clear, accessible, and conversational in tone
- Focused on practical application and personal growth
- Thoughtful and insightful without being preachy
- Written in second person ("you") to engage the reader directly

Write only the reflection itself, with no introduction, title, or attribution.`;

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
        max_tokens: Math.ceil(targetWords * 1.5), // Allow some extra tokens for flexibility
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
      }
    );

    const reflection = response.data.choices[0].message.content.trim();
    return reflection;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
}

/**
 * Fetch all passages that need reflections
 */
async function fetchPassagesNeedingReflections(
  filterAuthor?: string,
  filterWork?: string
): Promise<PassageData[]> {
  console.log('📚 Fetching passages from philosophical_passages...');

  let query = supabase
    .from('philosophical_passages')
    .select('id, source_author, source_work, source_section, condensed_passage, passage_length, reflection')
    .order('source_author')
    .order('source_work')
    .order('source_section');

  if (filterAuthor) {
    query = query.eq('source_author', filterAuthor);
  }
  if (filterWork) {
    query = query.eq('source_work', filterWork);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching passages: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No passages found');
    return [];
  }

  // Filter to only include passages without reflections
  const passagesNeedingReflections = data.filter(passage => !passage.reflection);

  console.log(`✅ Found ${data.length} total passages`);
  console.log(`🔍 ${passagesNeedingReflections.length} passages need reflections\n`);

  return passagesNeedingReflections;
}

/**
 * Update a passage with its generated reflection
 */
async function updatePassageWithReflection(
  passageId: string,
  reflection: string
): Promise<void> {
  const { error } = await supabase
    .from('philosophical_passages')
    .update({
      reflection: reflection,
      reflection_length: reflection.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', passageId);

  if (error) {
    throw new Error(`Error updating passage: ${error.message}`);
  }
}

/**
 * Main function to process all passages
 */
async function main() {
  console.log('🚀 Starting reflection generation for philosophical passages\n');

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
  if (limit) console.log(`🔍 Limiting to ${limit} passage(s)\n`);

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
    // Fetch all passages that need reflections
    const passages = await fetchPassagesNeedingReflections(filterAuthor, filterWork);

    if (passages.length === 0) {
      console.log('✅ No passages need reflections');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each passage
    for (let i = 0; i < passages.length; i++) {
      // Check if we've hit the limit
      if (limit && i >= limit) {
        console.log(`\n⏹️  Reached limit of ${limit} passage(s), stopping...`);
        break;
      }

      const passage = passages[i];
      const passageLabel = `${passage.source_author} - ${passage.source_work}${
        passage.source_section ? ` - ${passage.source_section}` : ''
      }`;

      console.log(`\n[${i + 1}/${passages.length}] Processing: ${passageLabel}`);
      console.log(`📝 Passage (${passage.passage_length} chars): ${passage.condensed_passage.substring(0, 80)}...`);

      try {
        // Generate the reflection
        console.log('🤖 Generating reflection with DeepSeek...');
        const reflection = await generateReflection(passage);
        console.log(`✨ Generated reflection (${reflection.length} chars, ${(reflection.length / passage.passage_length).toFixed(1)}x passage length)`);
        console.log(`📖 Preview: ${reflection.substring(0, 150)}...`);

        // Store in database
        console.log('💾 Updating database...');
        await updatePassageWithReflection(passage.id, reflection);
        console.log('✅ Stored successfully');

        processedCount++;

        // Rate limiting delay
        if (i < passages.length - 1 && (!limit || i + 1 < limit)) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      } catch (error) {
        console.error('❌ Error processing passage:', error);
        errorCount++;
        // Continue with next passage
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`✅ Processed: ${processedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📚 Total passages checked: ${passages.length}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
