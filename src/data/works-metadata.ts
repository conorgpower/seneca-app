// Book metadata - no database queries needed!
// This is a static list of all available philosophical works

export interface Book {
  id: string;
  title: string;
  author: string;
  emoji: string;
  description?: string;
  publishedYear?: number;
}

// All available books in the app
export const BOOKS: Book[] = [
  {
    id: 'enchiridion',
    title: 'The Enchiridion',
    author: 'Epictetus',
    emoji: '⚡',
    description: 'A short manual of Stoic ethical advice compiled by Arrian from Epictetus\' teachings.',
    publishedYear: 135,
  },
  {
    id: 'zarathustra',
    title: 'Thus Spake Zarathustra',
    author: 'Friedrich Nietzsche',
    emoji: '📚',
    description: 'A philosophical novel by Nietzsche dealing with ideas such as the "eternal recurrence" and the "Übermensch".',
    publishedYear: 1883,
  },
  {
    id: 'meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    emoji: '📖',
    description: 'Personal writings by Roman Emperor Marcus Aurelius, a cornerstone of Stoic philosophy.',
    publishedYear: 180,
  },
  {
    id: 'seneca-morals',
    title: "Seneca's Morals",
    author: 'Seneca',
    emoji: '🏛️',
    description: 'A collection of moral essays and letters by Seneca on Stoic ethics and practical wisdom.',
    publishedYear: 65,
  },
  {
    id: 'minor-dialogues',
    title: 'Minor Dialogues',
    author: 'Seneca',
    emoji: '📜',
    description: 'A collection of shorter dialogues and essays by Seneca on various philosophical topics.',
    publishedYear: 49,
  },
];

/**
 * Generate a random viewer count for a book (50-500 viewers)
 */
export function getRandomViewerCount(): number {
  return Math.floor(Math.random() * (500 - 50 + 1)) + 50;
}
