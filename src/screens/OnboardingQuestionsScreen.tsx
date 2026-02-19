import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface OnboardingQuestionsScreenProps {
  onComplete: (answers: Record<string, any>) => void;
  onBack: () => void;
  phase?: 1 | 2 | 3 | 4;
  overallProgress?: number;
  onQuestionChange?: (questionIndex: number) => void;
  initialQuestionIndex?: number;
}

type QuestionType = 'single' | 'multi';

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  subtitle?: string;
  options: Array<{ value: string; label: string; emoji?: string }>;
  multiSelect?: boolean;
  maxSelections?: number;
}

// PHASE 1: Questions 1-4
const PHASE_1_QUESTIONS: Question[] = [
  {
    id: 'identity',
    type: 'single',
    question: 'How do you identify?',
    subtitle: 'This helps us personalize your experience',
    options: [
      { value: 'man', label: 'Man', emoji: '👨' },
      { value: 'woman', label: 'Woman', emoji: '👩' },
      { value: 'prefer-not-say', label: 'Prefer not to say', emoji: '🙂' },
    ],
  },
  {
    id: 'cadence',
    type: 'single',
    question: 'How often do you want to reflect or journal?',
    subtitle: 'Be honest — consistency beats intensity',
    options: [
      { value: 'daily', label: 'Daily', emoji: '☀️' },
      { value: 'few-times', label: 'A few times a week', emoji: '📅' },
      { value: 'occasionally', label: 'Occasionally', emoji: '🌙' },
    ],
  },
  {
    id: 'source',
    type: 'single',
    question: 'How did you hear about Seneca?',
    subtitle: 'Just curious!',
    options: [
      { value: 'twitter', label: 'Twitter / X', emoji: '🐦' },
      { value: 'tiktok', label: 'TikTok', emoji: '📱' },
      { value: 'instagram', label: 'Instagram', emoji: '📷' },
      { value: 'youtube', label: 'YouTube', emoji: '🎥' },
      { value: 'facebook', label: 'Facebook', emoji: '👍' },
      { value: 'reddit', label: 'Reddit', emoji: '👽' },
      { value: 'chatgpt', label: 'ChatGPT / LLMs', emoji: '🤖' },
      { value: 'friend', label: 'Friend', emoji: '👥' },
      { value: 'podcast', label: 'Podcast', emoji: '🎙️' },
      { value: 'app-store', label: 'App Store', emoji: '📲' },
      { value: 'google-search', label: 'Google Search', emoji: '🔍' },
      { value: 'other', label: 'Other', emoji: '💡' },
    ],
  },
  {
    id: 'tried-apps',
    type: 'single',
    question: 'Have you tried any self-improvement or journaling apps before?',
    subtitle: "We're building something different",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
];

// PHASE 2: Questions 6-10
const PHASE_2_QUESTIONS: Question[] = [
  {
    id: 'mental-state',
    type: 'single',
    question: 'How would you describe your current mental state?',
    subtitle: 'No judgment — just a baseline',
    options: [
      { value: 'calm', label: 'Calm', emoji: '😌' },
      { value: 'stressed', label: 'Stressed', emoji: '😰' },
      { value: 'overthinking', label: 'Overthinking', emoji: '🤔' },
      { value: 'directionless', label: 'Directionless', emoji: '🧭' },
    ],
  },
  {
    id: 'birth-year',
    type: 'single',
    question: 'When were you born?',
    subtitle: 'This helps us tailor guidance to your life stage',
    options: [
      { value: '2013-2024', label: 'Gen Alpha (2013-2024)', emoji: '🤖' },
      { value: '2005-2012', label: 'Gen Z (2005-2012)', emoji: '🎮' },
      { value: '1997-2004', label: 'Gen Z (1997-2004)', emoji: '📱' },
      { value: '1981-1996', label: 'Millennial (1981-1996)', emoji: '💻' },
      { value: '1965-1980', label: 'Gen X (1965-1980)', emoji: '📼' },
      { value: '1946-1964', label: 'Baby Boomer (1946-1964)', emoji: '📺' },
      { value: 'before-1946', label: 'Before 1946', emoji: '📻' },
    ],
  },
  {
    id: 'external-guidance',
    type: 'single',
    question: 'Do you currently work with a coach, therapist, or mentor?',
    subtitle: 'Seneca complements professional support',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'primary-goal',
    type: 'single',
    question: 'What are you here to improve?',
    subtitle: 'Choose your main focus',
    options: [
      { value: 'discipline', label: 'Discipline', emoji: '🎯' },
      { value: 'emotional-control', label: 'Emotional control', emoji: '😌' },
      { value: 'focus', label: 'Focus', emoji: '🔍' },
      { value: 'confidence', label: 'Confidence', emoji: '💪' },
      { value: 'purpose', label: 'Purpose', emoji: '✨' },
    ],
  },
  {
    id: 'desired-state',
    type: 'single',
    question: 'If this works perfectly, how do you want to feel in 90 days?',
    subtitle: 'Your north star',
    options: [
      { value: 'calm-pressure', label: 'Calm under pressure', emoji: '🧘' },
      { value: 'clear-decisive', label: 'Clear and decisive', emoji: '⚡' },
      { value: 'consistent', label: 'Consistent', emoji: '📈' },
      { value: 'grounded', label: 'Grounded', emoji: '🌳' },
    ],
  },
];

// PHASE 3: Questions 12-16
const PHASE_3_QUESTIONS: Question[] = [
  {
    id: 'pace',
    type: 'single',
    question: 'How fast do you want to change?',
    subtitle: 'Different speeds work for different people',
    options: [
      { value: 'gentle', label: 'Gentle', emoji: '🌱' },
      { value: 'recommended', label: 'Recommended', emoji: '⭐' },
      { value: 'intense', label: 'Intense', emoji: '🔥' },
    ],
  },
  {
    id: 'friction',
    type: 'multi',
    question: 'What usually gets in your way?',
    subtitle: 'Select all that apply',
    multiSelect: true,
    options: [
      { value: 'procrastination', label: 'Procrastination', emoji: '⏰' },
      { value: 'overthinking', label: 'Overthinking', emoji: '🤯' },
      { value: 'emotional-reactions', label: 'Emotional reactions', emoji: '😤' },
      { value: 'inconsistency', label: 'Inconsistency', emoji: '📉' },
      { value: 'lack-direction', label: 'Lack of direction', emoji: '🧭' },
    ],
  },
  {
    id: 'philosophy',
    type: 'single',
    question: 'Do you follow any philosophy or framework?',
    subtitle: "We'll adapt to your worldview",
    options: [
      { value: 'stoicism', label: 'Stoicism', emoji: '🏛️' },
      { value: 'buddhism', label: 'Buddhism', emoji: '☸️' },
      { value: 'christianity', label: 'Christianity', emoji: '✝️' },
      { value: 'islam', label: 'Islam', emoji: '☪️' },
      { value: 'judaism', label: 'Judaism', emoji: '✡️' },
      { value: 'hinduism', label: 'Hinduism', emoji: '🕉️' },
      { value: 'taoism', label: 'Taoism', emoji: '☯️' },
      { value: 'existentialism', label: 'Existentialism', emoji: '🤔' },
      { value: 'spiritual', label: 'Spiritual (Non-religious)', emoji: '✨' },
      { value: 'none', label: 'None - Just Curious', emoji: '💭' },
    ],
  },
  {
    id: 'outcome',
    type: 'single',
    question: 'What would success unlock for you?',
    subtitle: 'The bigger picture',
    options: [
      { value: 'relationships', label: 'Better relationships', emoji: '💝' },
      { value: 'career', label: 'Career focus', emoji: '🚀' },
      { value: 'peace', label: 'Inner peace', emoji: '☮️' },
      { value: 'self-respect', label: 'Self-respect', emoji: '👑' },
    ],
  },
];

// PHASE 4: Questions 19-20
const PHASE_4_QUESTIONS: Question[] = [
  {
    id: 'challenge-thinking',
    type: 'single',
    question: 'Do you want Seneca to challenge your thinking?',
    subtitle: 'Some prefer gentleness, others want directness',
    options: [
      { value: 'direct', label: 'Yes, be direct', emoji: '💪' },
      { value: 'gentle', label: 'Keep it gentle', emoji: '🤲' },
    ],
  },
  {
    id: 'auto-resume',
    type: 'single',
    question: 'If you miss a day, should we help you resume automatically?',
    subtitle: 'Life happens — we can help you get back on track',
    options: [
      { value: 'yes', label: 'Yes, help me resume' },
      { value: 'no', label: "No, I'll restart myself" },
    ],
  },
];

export default function OnboardingQuestionsScreen({
  onComplete,
  onBack,
  phase = 1,
  overallProgress,
  onQuestionChange,
  initialQuestionIndex = 0,
}: OnboardingQuestionsScreenProps) {
  const [currentStep, setCurrentStep] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fadeAnim] = useState(new Animated.Value(1));

  // Notify parent of question change
  React.useEffect(() => {
    onQuestionChange?.(currentStep);
  }, [currentStep, onQuestionChange]);

  // Select the right question set based on phase
  const getQuestionsForPhase = (): Question[] => {
    switch (phase) {
      case 1:
        return PHASE_1_QUESTIONS;
      case 2:
        return PHASE_2_QUESTIONS;
      case 3:
        return PHASE_3_QUESTIONS;
      case 4:
        return PHASE_4_QUESTIONS;
      default:
        return PHASE_1_QUESTIONS;
    }
  };

  const questions = getQuestionsForPhase();
  const currentQuestion = questions[currentStep];
  
  // Use overall progress if provided, otherwise calculate local progress
  const progress = overallProgress ?? ((currentStep + 1) / questions.length) * 100;

  const handleSelect = (optionValue: string) => {
    const question = currentQuestion;

    if (question.type === 'multi' && question.multiSelect) {
      const currentAnswer = (answers[question.id] as string[]) || [];
      let newAnswer: string[];

      if (currentAnswer.includes(optionValue)) {
        // Deselect
        newAnswer = currentAnswer.filter((val) => val !== optionValue);
      } else {
        // Select
        if (question.maxSelections && currentAnswer.length >= question.maxSelections) {
          // Replace the first selection if max reached
          newAnswer = [...currentAnswer.slice(1), optionValue];
        } else {
          newAnswer = [...currentAnswer, optionValue];
        }
      }

      setAnswers({ ...answers, [question.id]: newAnswer });
    } else {
      // Single select
      setAnswers({ ...answers, [question.id]: optionValue });
    }
  };

  const isOptionSelected = (optionValue: string): boolean => {
    const answer = answers[currentQuestion.id];
    if (Array.isArray(answer)) {
      return answer.includes(optionValue);
    }
    return answer === optionValue;
  };

  const canContinue = (): boolean => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'multi' && currentQuestion.multiSelect) {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  };

  const handleContinue = () => {
    if (!canContinue()) return;

    if (currentStep < questions.length - 1) {
      // Fade out current question
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
        // Fade in next question
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Complete this phase
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button & Progress Bar */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.topBackButton} onPress={handleBack}>
            <Text style={styles.topBackButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Question Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.question}>{currentQuestion.question}</Text>
            {currentQuestion.subtitle && (
              <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
            )}

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option) => {
                const isSelected = isOptionSelected(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    {option.emoji && <Text style={styles.optionEmoji}>{option.emoji}</Text>}
                    <Text
                      style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {currentQuestion.type === 'multi' && currentQuestion.multiSelect && (
              <Text style={styles.multiSelectHint}>
                {currentQuestion.maxSelections
                  ? `Select up to ${currentQuestion.maxSelections}`
                  : 'Select all that apply'}
              </Text>
            )}
          </ScrollView>
        </Animated.View>

        {/* Continue Button */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.continueButton, !canContinue() && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  topBackButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  topBackButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: theme.spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  multiSelectHint: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontStyle: 'italic',
  },
  navigation: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
