// ============================================================================
// GENERATE FAKE REFLECTIONS SCRIPT
// ============================================================================
// Generates fake reflections for the Community feature
// Usage:
//   npm run generate-fake-reflections -- --count 100
//   npm run generate-fake-reflections -- --count 10

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const BATCH_DELAY_MS = 1000; // 1 second delay between API calls

// Pre-defined Stoic thought prompts (50+ prompts)
const THOUGHT_PROMPTS = [
  'I\'m struggling with impatience today',
  'Learning to accept what I cannot change',
  'Feeling grateful for small moments',
  'Reflecting on the nature of virtue',
  'Finding peace amid uncertainty',
  'Practicing mindfulness in daily tasks',
  'Seeking clarity on a difficult decision',
  'Letting go of things beyond my control',
  'Embracing obstacles as opportunities',
  'Cultivating inner tranquility',
  'Focusing on what truly matters',
  'Accepting criticism with grace',
  'Managing anger through reason',
  'Finding strength in adversity',
  'Appreciating the present moment',
  'Balancing ambition with contentment',
  'Dealing with disappointment constructively',
  'Nurturing compassion for others',
  'Overcoming fear through courage',
  'Practicing self-discipline daily',
  'Seeking wisdom in setbacks',
  'Maintaining equanimity in chaos',
  'Resisting unhelpful desires',
  'Honoring my commitments',
  'Living in accordance with nature',
  'Developing emotional resilience',
  'Pursuing excellence not perfection',
  'Accepting mortality with peace',
  'Choosing virtue over pleasure',
  'Responding rather than reacting',
  'Cultivating patience with myself',
  'Finding meaning in struggle',
  'Practicing voluntary discomfort',
  'Embracing change as constant',
  'Letting go of ego',
  'Focusing on character over reputation',
  'Accepting others as they are',
  'Finding freedom in acceptance',
  'Pursuing wisdom daily',
  'Practicing negative visualization',
  'Developing mental fortitude',
  'Choosing kindness over being right',
  'Managing expectations wisely',
  'Accepting impermanence',
  'Nurturing inner peace',
  'Viewing obstacles as the way',
  'Practicing memento mori',
  'Cultivating gratitude',
  'Finding joy in simple things',
  'Responding to adversity with virtue',
  'Accepting what comes with grace',
];

// Generate anonymous name helpers
const ADJECTIVES = [
  'Truth',
  'Wisdom',
  'Virtue',
  'Stoic',
  'Calm',
  'Mindful',
  'Serene',
  'Patient',
  'Noble',
  'Brave',
  'Gentle',
  'Steadfast',
  'Tranquil',
  'Resilient',
  'Thoughtful',
];

const NOUNS = [
  'Seeker',
  'Wanderer',
  'Guardian',
  'Scholar',
  'Sage',
  'Philosopher',
  'Thinker',
  'Observer',
  'Student',
  'Learner',
  'Warrior',
  'Traveler',
  'Pilgrim',
  'Disciple',
  'Explorer',
];

function generateAnonymousName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 10000);
  return `${adjective} ${noun} ${number}`;
}

function getRandomPrompt(usedPrompts: Set<string>): string | null {
  const availablePrompts = THOUGHT_PROMPTS.filter((p) => !usedPrompts.has(p));
  if (availablePrompts.length === 0) return null;
  return availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
}

async function generateReflection(inputText: string): Promise<string> {
  try {
    const systemPrompt = `You are a wise Stoic philosopher and guide. Your role is to take a person's brief thought or feeling and expand it into a meaningful, practical reflection rooted in Stoic philosophy.

Your reflections should:
- Be 2-3 short paragraphs (300-500 words total)
- Focus on Stoic principles: virtue, acceptance, what is in our control vs what is not
- Provide practical wisdom and actionable insights
- Be warm, compassionate, and encouraging
- Help the person find peace, clarity, or strength
- Reference Stoic concepts naturally without being preachy

Write in a calm, thoughtful tone. Make the reflection personal and relevant to their specific thought.`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please create a Stoic reflection based on this thought: "${inputText}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const generatedText = response.data.choices[0]?.message?.content;
    if (!generatedText) {
      throw new Error('No response generated from AI');
    }

    return generatedText.trim();
  } catch (error) {
    console.error('Error generating reflection:', error);
    throw error;
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let count = 50; // Default count

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      if (isNaN(count) || count <= 0) {
        console.error('❌ Invalid count value. Must be a positive number.');
        process.exit(1);
      }
    }
  }

  console.log('\n🌟 Generating Fake Reflections for Community Feature');
  console.log('=' + '='.repeat(60));
  console.log(`📊 Target count: ${count} reflections`);
  console.log(`⏱️  Rate limit: ${BATCH_DELAY_MS}ms delay between API calls\n`);

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env');
    process.exit(1);
  }

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ Missing DeepSeek API key');
    console.error('   Please ensure DEEPSEEK_API_KEY is set in .env');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const usedPrompts = new Set<string>();

  // Generate fake reflections
  for (let i = 0; i < count; i++) {
    try {
      // Get random prompt
      const inputText = getRandomPrompt(usedPrompts);
      if (!inputText) {
        console.log('\n⚠️  Ran out of unique prompts. Stopping early.');
        break;
      }

      usedPrompts.add(inputText);

      // Check if reflection with this input already exists
      const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('input_text', inputText)
        .eq('is_fake', true)
        .single();

      if (existing) {
        console.log(
          `[${i + 1}/${count}] ⏭️  Skipped (already exists): "${inputText.substring(0, 40)}..."`
        );
        skippedCount++;
        continue;
      }

      // Generate display name
      const displayName = generateAnonymousName();

      // Generate AI reflection
      console.log(
        `[${i + 1}/${count}] 🤖 Generating reflection for: "${inputText.substring(0, 40)}..."`
      );
      const generatedText = await generateReflection(inputText);

      // Insert into database
      const { error: insertError } = await supabase.from('reflections').insert({
        display_name: displayName,
        input_text: inputText,
        generated_text: generatedText,
        is_fake: true,
        status: 'queued',
      });

      if (insertError) {
        throw insertError;
      }

      console.log(`[${i + 1}/${count}] ✅ Created: ${displayName}`);
      processedCount++;

      // Rate limiting delay (except for last item)
      if (i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    } catch (error) {
      console.error(`[${i + 1}/${count}] ❌ Error:`, error);
      errorCount++;
      // Continue with next reflection
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   ✅ Successfully created: ${processedCount}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total processed: ${processedCount + skippedCount + errorCount}/${count}`);
  console.log('=' + '='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.log('⚠️  Some reflections failed. Check errors above for details.');
  }

  if (processedCount > 0) {
    console.log('✨ Fake reflections generated successfully!');
    console.log('   They will enter the rotation queue automatically.');
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script completed.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
