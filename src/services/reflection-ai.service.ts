// ============================================================================
// REFLECTION AI SERVICE
// ============================================================================
// AI generation service for reflections using DeepSeek API
// Pattern follows ai.service.ts

import { callAIProxy, AIDailyLimitError } from './ai-proxy';
import type { GenerateReflectionResponse } from '../types/reflection.types';

// The system prompt, model and daily limit live in the deepseek-proxy edge function.

/**
 * Generate a Stoic reflection from user input
 */
export async function generateReflection(
  inputText: string,
  personalizationHint?: string | null
): Promise<GenerateReflectionResponse> {
  if (!inputText || inputText.trim().length === 0) {
    return { generatedText: '', error: new Error('Input text cannot be empty') };
  }
  if (inputText.length > 200) {
    return { generatedText: '', error: new Error('Input text cannot exceed 200 characters') };
  }

  try {
    const generatedText = await callAIProxy({
      feature: 'reflection',
      inputText: inputText.trim(),
      personalizationHint,
    });
    return { generatedText, error: null };
  } catch (error) {
    console.error('Error generating reflection:', error);
    return {
      generatedText: '',
      error:
        error instanceof AIDailyLimitError
          ? new Error("You've shared the maximum reflections for today. Please come back tomorrow.")
          : new Error('Failed to generate reflection. Please try again.'),
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
