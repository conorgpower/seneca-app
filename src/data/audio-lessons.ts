import type { AudioSource } from 'expo-audio';
import { getSupabaseAudioSource } from './asset-cdn';

export type AudioLessonId =
  | 'amor_fati'
  | 'the_borrowed_cup'
  | 'memento_mori'
  | 'obstacle_becomes_way'
  | 'arrow_and_target'
  | 'two_handles';

type AudioLessonMeta = {
  id: AudioLessonId;
  title: string;
  description: string;
  path: string;
};

const AUDIO_LESSONS: AudioLessonMeta[] = [
  {
    id: 'amor_fati',
    title: 'Amor Fati',
    description: 'Loving your fate and embracing what happens.',
    path: 'audio/lessons/Amor_Fati.mp3',
  },
  {
    id: 'the_borrowed_cup',
    title: 'The Borrowed Cup',
    description: 'A Stoic lesson on attachment and gratitude.',
    path: 'audio/lessons/The_Borrowed_Cup.mp3',
  },
  {
    id: 'memento_mori',
    title: 'Memento Mori',
    description: 'Remembering mortality to live with intention.',
    path: 'audio/lessons/Memento_Mori.mp3',
  },
  {
    id: 'obstacle_becomes_way',
    title: 'The Obstacle Becomes The Way',
    description: 'Turning adversity into growth through perspective.',
    path: 'audio/lessons/The_Obstacle_Becomes_The_Way.mp3',
  },
  {
    id: 'arrow_and_target',
    title: 'The Arrow and the Target',
    description: 'Focus on your aim, not outcomes beyond control.',
    path: 'audio/lessons/The_Arrow_And_The_Target.mp3',
  },
  {
    id: 'two_handles',
    title: 'The Two Handles',
    description: 'Choosing the interpretation that serves virtue.',
    path: 'audio/lessons/The_Two_Handles.mp3',
  },
];

export const LESSONS = AUDIO_LESSONS.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  description: lesson.description,
}));

export function getAudioLessonById(id: string): AudioLessonMeta | null {
  return AUDIO_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export function getAudioLessonPrimarySource(id: string): AudioSource | null {
  const lesson = getAudioLessonById(id);
  if (!lesson) return null;

  const remote = getSupabaseAudioSource(lesson.path);
  if (!remote) return null;
  return { uri: remote };
}

export function getAudioLessonFallbackSource(id: string): AudioSource | null {
  void id;
  return null;
}
