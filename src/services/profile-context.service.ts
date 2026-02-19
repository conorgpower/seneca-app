// ============================================================================
// PROFILE CONTEXT SERVICE
// ============================================================================
// Builds lightweight, non-sensitive personalization hints from onboarding answers.

type OnboardingAnswers = Record<string, any> | null | undefined;

function toTitle(value: string): string {
  return value.replace(/-/g, ' ').trim();
}

export function buildLightPersonalizationHint(answers: OnboardingAnswers): string | null {
  if (!answers) return null;

  const parts: string[] = [];

  if (typeof answers['primary-goal'] === 'string') {
    parts.push(`goal: ${toTitle(answers['primary-goal'])}`);
  }

  if (typeof answers['desired-state'] === 'string') {
    parts.push(`wants to feel: ${toTitle(answers['desired-state'])}`);
  }

  if (Array.isArray(answers['friction']) && answers['friction'].length > 0) {
    const friction = answers['friction']
      .slice(0, 2)
      .map((item: string) => toTitle(item))
      .join(', ');
    parts.push(`common obstacles: ${friction}`);
  }

  if (typeof answers['challenge-thinking'] === 'string') {
    const style = answers['challenge-thinking'] === 'direct' ? 'direct guidance' : 'gentle guidance';
    parts.push(`preferred style: ${style}`);
  }

  if (typeof answers['pace'] === 'string') {
    parts.push(`preferred pace: ${toTitle(answers['pace'])}`);
  }

  if (typeof answers['philosophy'] === 'string') {
    parts.push(`framework affinity: ${toTitle(answers['philosophy'])}`);
  }

  if (parts.length === 0) return null;

  return parts.slice(0, 4).join('; ');
}
