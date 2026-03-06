export type AchievementCategory =
  | 'daily_rituals'
  | 'audio_lessons'
  | 'breathwork'
  | 'comics'
  | 'books'
  | 'community'
  | 'chat'
  | 'special';

export type AchievementId =
  | 'first_dawn'
  | 'week_of_wisdom'
  | 'month_of_virtue'
  | 'century_of_practice'
  | 'ten_completions'
  | 'fifty_completions'
  | 'hundred_completions'
  | 'first_lesson'
  | 'three_lessons'
  | 'all_lessons'
  | 'first_breath'
  | 'three_breaths'
  | 'all_breaths'
  | 'first_comic'
  | 'five_comics'
  | 'all_comics'
  | 'first_book'
  | 'all_books'
  | 'first_reflection'
  | 'five_reflections'
  | 'first_conversation'
  | 'ten_conversations'
  | 'focus_lock_activated'
  | 'check_in_variety';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  condition: string;
  category: AchievementCategory;
  categoryLabel: string;
  sortOrder: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Daily Rituals
  {
    id: 'first_dawn',
    name: 'Scroll of First Dawn',
    description: 'Every journey begins with a single step.',
    condition: 'Complete your first daily ritual.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 1,
  },
  {
    id: 'week_of_wisdom',
    name: 'Scroll of the Devoted Week',
    description: 'Seven days of philosophy shape a lifetime.',
    condition: 'Reach a 7-day streak.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 2,
  },
  {
    id: 'month_of_virtue',
    name: 'Scroll of the Virtuous Month',
    description: 'A month of discipline reveals the true philosopher.',
    condition: 'Reach a 30-day streak.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 3,
  },
  {
    id: 'century_of_practice',
    name: 'Scroll of the Century',
    description: '100 days of consistent practice is rare indeed.',
    condition: 'Reach a 100-day streak.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 4,
  },
  {
    id: 'ten_completions',
    name: 'Scroll of Persistence',
    description: 'The drops of water hollow the stone.',
    condition: 'Complete 10 daily rituals.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 5,
  },
  {
    id: 'fifty_completions',
    name: 'Scroll of the Disciplined Mind',
    description: 'Repetition is the mother of learning.',
    condition: 'Complete 50 daily rituals.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 6,
  },
  {
    id: 'hundred_completions',
    name: 'Scroll of the Philosopher King',
    description: 'To rule oneself is the greatest empire.',
    condition: 'Complete 100 daily rituals.',
    category: 'daily_rituals',
    categoryLabel: 'Daily Rituals',
    sortOrder: 7,
  },

  // Audio Lessons
  {
    id: 'first_lesson',
    name: 'Scroll of the Listening Ear',
    description: 'Wisdom enters through those who listen.',
    condition: 'Listen to 1 audio lesson.',
    category: 'audio_lessons',
    categoryLabel: 'Audio Lessons',
    sortOrder: 8,
  },
  {
    id: 'three_lessons',
    name: 'Scroll of the Attentive Student',
    description: 'The student who listens to many teachers grows wise.',
    condition: 'Listen to 3 audio lessons.',
    category: 'audio_lessons',
    categoryLabel: 'Audio Lessons',
    sortOrder: 9,
  },
  {
    id: 'all_lessons',
    name: 'Scroll of Auditory Mastery',
    description: 'You have heard all the teachings. Now live them.',
    condition: 'Listen to all 6 audio lessons.',
    category: 'audio_lessons',
    categoryLabel: 'Audio Lessons',
    sortOrder: 10,
  },

  // Breathwork
  {
    id: 'first_breath',
    name: 'Scroll of the First Breath',
    description: 'Begin with the breath — it is the bridge between body and mind.',
    condition: 'Complete 1 breathwork exercise.',
    category: 'breathwork',
    categoryLabel: 'Breathwork',
    sortOrder: 11,
  },
  {
    id: 'three_breaths',
    name: 'Scroll of the Calm Mind',
    description: 'Through breath, the Stoic finds stillness.',
    condition: 'Complete 3 breathwork exercises.',
    category: 'breathwork',
    categoryLabel: 'Breathwork',
    sortOrder: 12,
  },
  {
    id: 'all_breaths',
    name: 'Scroll of Pneuma',
    description: 'Mastery of breath is mastery of self.',
    condition: 'Complete all 6 breathwork exercises.',
    category: 'breathwork',
    categoryLabel: 'Breathwork',
    sortOrder: 13,
  },

  // Comics
  {
    id: 'first_comic',
    name: 'Scroll of the Illustrated Truth',
    description: 'Wisdom takes many forms, even pictures.',
    condition: 'Read 1 comic.',
    category: 'comics',
    categoryLabel: 'Comics',
    sortOrder: 14,
  },
  {
    id: 'five_comics',
    name: 'Scroll of the Visual Philosopher',
    description: 'Half the stories told, half the wisdom gained.',
    condition: 'Read 5 comics.',
    category: 'comics',
    categoryLabel: 'Comics',
    sortOrder: 15,
  },
  {
    id: 'all_comics',
    name: 'Scroll of the Complete Gallery',
    description: 'Every tale of wisdom has been witnessed.',
    condition: 'Read all 10 comics.',
    category: 'comics',
    categoryLabel: 'Comics',
    sortOrder: 16,
  },

  // Books
  {
    id: 'first_book',
    name: 'Scroll of the Open Book',
    description: 'A book is a garden carried in the pocket.',
    condition: 'Open 1 book.',
    category: 'books',
    categoryLabel: 'Books',
    sortOrder: 17,
  },
  {
    id: 'all_books',
    name: 'Scroll of the Scholar',
    description: 'To read all the masters is to sit at the feet of giants.',
    condition: 'Open all 5 books.',
    category: 'books',
    categoryLabel: 'Books',
    sortOrder: 18,
  },

  // Community
  {
    id: 'first_reflection',
    name: 'Scroll of Shared Wisdom',
    description: 'The unshared thought benefits only one mind.',
    condition: 'Share 1 reflection with the community.',
    category: 'community',
    categoryLabel: 'Community',
    sortOrder: 19,
  },
  {
    id: 'five_reflections',
    name: 'Scroll of the Community Voice',
    description: 'Your voice strengthens the chorus of wisdom.',
    condition: 'Share 5 reflections with the community.',
    category: 'community',
    categoryLabel: 'Community',
    sortOrder: 20,
  },

  // Chat
  {
    id: 'first_conversation',
    name: 'Scroll of the First Dialogue',
    description: 'The dialogue is the highest form of philosophy.',
    condition: 'Have 1 conversation with the Stoic guide.',
    category: 'chat',
    categoryLabel: 'Chat',
    sortOrder: 21,
  },
  {
    id: 'ten_conversations',
    name: 'Scroll of the Seasoned Dialectician',
    description: 'Through many dialogues, understanding deepens.',
    condition: 'Have 10 conversations with the Stoic guide.',
    category: 'chat',
    categoryLabel: 'Chat',
    sortOrder: 22,
  },

  // Special
  {
    id: 'focus_lock_activated',
    name: 'Scroll of Focused Attention',
    description: 'To remove distraction is to find clarity.',
    condition: 'Activate Focus Lock.',
    category: 'special',
    categoryLabel: 'Special',
    sortOrder: 23,
  },
  {
    id: 'check_in_variety',
    name: 'Scroll of Emotional Range',
    description: 'The wise person observes all states of the soul.',
    condition: 'Check in with mood below 25 and above 75.',
    category: 'special',
    categoryLabel: 'Special',
    sortOrder: 24,
  },
];

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

export function getAchievementCategories(): { category: AchievementCategory; label: string }[] {
  const seen = new Set<AchievementCategory>();
  const result: { category: AchievementCategory; label: string }[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!seen.has(a.category)) {
      seen.add(a.category);
      result.push({ category: a.category, label: a.categoryLabel });
    }
  }
  return result;
}
