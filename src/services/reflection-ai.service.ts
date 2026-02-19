// ============================================================================
// REFLECTION AI SERVICE
// ============================================================================
// AI generation service for reflections using DeepSeek API
// Pattern follows ai.service.ts

import axios from 'axios';
import Constants from 'expo-constants';
import type { GenerateReflectionResponse } from '../types/reflection.types';

const DEEPSEEK_API_KEY = Constants.expoConfig?.extra?.deepseekApiKey || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a wise Stoic philosopher and guide. Your role is to take a person's brief thought or feeling and expand it into a meaningful, practical reflection rooted in Stoic philosophy.

Your reflections should:
- Be 2-3 short paragraphs (300-500 words total)
- Focus on Stoic principles: virtue, acceptance, what is in our control vs what is not
- Provide practical wisdom and actionable insights
- Be warm, compassionate, and encouraging
- Help the person find peace, clarity, or strength
- Reference Stoic concepts naturally without being preachy

Write in a calm, thoughtful tone. Make the reflection personal and relevant to their specific thought.`;

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Generate a Stoic reflection from user input
 */
export async function generateReflection(
  inputText: string,
  personalizationHint?: string | null
): Promise<GenerateReflectionResponse> {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API key not configured');
    }

    if (!inputText || inputText.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }

    if (inputText.length > 200) {
      throw new Error('Input text cannot exceed 200 characters');
    }

    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `${personalizationHint ? `Light profile context (optional, use only if relevant): ${personalizationHint}\n\n` : ''}Please create a Stoic reflection based on this thought: "${inputText.trim()}"`,
      },
    ];

    const response = await axios.post<DeepSeekResponse>(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const generatedText = response.data.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No response generated from AI');
    }

    return {
      generatedText: generatedText.trim(),
      error: null,
    };
  } catch (error) {
    console.error('Error generating reflection:', error);

    let errorMessage = 'Failed to generate reflection. Please try again.';

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'AI service authentication failed.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      }
    }

    return {
      generatedText: '',
      error: new Error(errorMessage),
    };
  }
}

/**
 * Generate a random fake reflection for community simulation
 * Used by the generateFakeReflections.ts script
 */
export async function generateFakeReflection(
  inputText: string
): Promise<GenerateReflectionResponse> {
  // Same logic as generateReflection
  return generateReflection(inputText);
}

/**
 * Helper: Generate an anonymous display name
 * Format: "Adjective Noun Number"
 */
export function generateAnonymousName(): string {
  const adjectives = [
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

  const nouns = [
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

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 10000);

  return `${adjective} ${noun} ${number}`;
}
