export type BreathworkExerciseId =
  | 'box_breathing'
  | 'four_seven_eight'
  | 'physiological_sigh'
  | 'resonance_breathing'
  | 'power_breath'
  | 'cadence_breathing';

export type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';

export type BreathPhaseTiming = {
  phase: BreathPhase;
  durationSeconds: number;
  /** For physiological sigh: target expansion (0-1) instead of default */
  targetExpansion?: number;
};

export type BreathworkIconName =
  | 'Square2StackIcon'
  | 'MoonIcon'
  | 'BoltIcon'
  | 'HeartIcon'
  | 'FireIcon'
  | 'MusicalNoteIcon';

export type BreathworkExercise = {
  id: BreathworkExerciseId;
  title: string;
  subtitle: string;
  description: string;
  purpose: string;
  durationMinutes: number;
  phases: BreathPhaseTiming[];
  icon: BreathworkIconName;
};

export const BREATHWORK_EXERCISES: BreathworkExercise[] = [
  {
    id: 'box_breathing',
    title: 'Box Breathing',
    subtitle: '4-4-4-4',
    description: 'Equal inhale, hold, exhale, hold for balanced calm.',
    purpose: 'Calm Nerves',
    durationMinutes: 4,
    icon: 'Square2StackIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 4 },
      { phase: 'hold', durationSeconds: 4 },
      { phase: 'exhale', durationSeconds: 4 },
      { phase: 'holdAfterExhale', durationSeconds: 4 },
    ],
  },
  {
    id: 'four_seven_eight',
    title: '4-7-8 Breathing',
    subtitle: '4-7-8',
    description: 'Inhale 4, hold 7, exhale 8 for deep relaxation.',
    purpose: 'Anxiety & Sleep',
    durationMinutes: 5,
    icon: 'MoonIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 4 },
      { phase: 'hold', durationSeconds: 7 },
      { phase: 'exhale', durationSeconds: 8 },
    ],
  },
  {
    id: 'physiological_sigh',
    title: 'Physiological Sigh',
    subtitle: 'Double inhale + long exhale',
    description: 'Two quick inhales, one long exhale for instant relief.',
    purpose: 'Instant Relief',
    durationMinutes: 2,
    icon: 'BoltIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 2, targetExpansion: 0.6 },
      { phase: 'inhale', durationSeconds: 1, targetExpansion: 1.0 },
      { phase: 'exhale', durationSeconds: 6 },
    ],
  },
  {
    id: 'resonance_breathing',
    title: 'Resonance Breathing',
    subtitle: '5-5',
    description: 'Equal 5-second inhale and exhale for heart coherence.',
    purpose: 'Baseline Regulation',
    durationMinutes: 5,
    icon: 'HeartIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 5 },
      { phase: 'exhale', durationSeconds: 5 },
    ],
  },
  {
    id: 'power_breath',
    title: 'Power Breath',
    subtitle: '2-2-3',
    description: 'Energizing pattern with sharp exhale for activation.',
    purpose: 'Energy & Motivation',
    durationMinutes: 3,
    icon: 'FireIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 2 },
      { phase: 'hold', durationSeconds: 2 },
      { phase: 'exhale', durationSeconds: 3 },
    ],
  },
  {
    id: 'cadence_breathing',
    title: 'Cadence Breathing',
    subtitle: '3-6',
    description: 'Short inhale, extended exhale to calm the nervous system.',
    purpose: 'Emotional Regulation',
    durationMinutes: 4,
    icon: 'MusicalNoteIcon',
    phases: [
      { phase: 'inhale', durationSeconds: 3 },
      { phase: 'exhale', durationSeconds: 6 },
    ],
  },
];

export function getBreathworkExerciseById(
  id: string,
): BreathworkExercise | undefined {
  return BREATHWORK_EXERCISES.find((ex) => ex.id === id);
}

export function getCycleDuration(exercise: BreathworkExercise): number {
  return exercise.phases.reduce((sum, p) => sum + p.durationSeconds, 0);
}

export function getPhaseLabel(phase: BreathPhase): string {
  switch (phase) {
    case 'inhale':
      return 'Inhale';
    case 'hold':
      return 'Hold';
    case 'exhale':
      return 'Exhale';
    case 'holdAfterExhale':
      return 'Hold';
  }
}
