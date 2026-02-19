import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_QUESTIONS = [
  {
    id: 1,
    question: 'What brings you to Seneca?',
    options: [
      'Find inner peace',
      'Develop resilience',
      'Gain wisdom',
      'Improve decision-making',
      'Live more intentionally',
    ],
  },
  {
    id: 2,
    question: 'Which philosopher resonates with you?',
    options: [
      'Marcus Aurelius - Stoic Emperor',
      'Seneca - Practical Wisdom',
      'Epictetus - Freedom & Control',
      'Nietzsche - Power & Will',
      'Not sure yet',
    ],
  },
  {
    id: 3,
    question: 'How often do you want to practice?',
    options: [
      'Daily',
      'A few times a week',
      'Weekly',
      'As needed',
    ],
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});

  const currentQuestion = ONBOARDING_QUESTIONS[currentStep];

  const handleSelect = (option: string) => {
    setSelections({ ...selections, [currentQuestion.id]: option });

    if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleContinue = () => {
    if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
        {ONBOARDING_QUESTIONS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>
          Question {currentStep + 1} of {ONBOARDING_QUESTIONS.length}
        </Text>

        <Text style={styles.question}>{currentQuestion.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                selections[currentQuestion.id] === option && styles.optionSelected,
              ]}
              onPress={() => handleSelect(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  selections[currentQuestion.id] === option &&
                    styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {selections[currentQuestion.id] && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {currentStep === ONBOARDING_QUESTIONS.length - 1
                ? 'Complete'
                : 'Continue'}
            </Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: theme.colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  content: {
    padding: theme.spacing.lg,
    flexGrow: 1,
  },
  stepLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  question: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: theme.spacing.md,
  },
  option: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    padding: theme.spacing.lg,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
