import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { getSupabaseImageSource } from '../data/asset-cdn';
import { AppBackground } from '../components/AppBackground';
import MoodWheel from '../components/MoodWheel';
import DatePicker from '../components/DatePicker';
import { FontAwesome6 } from '@expo/vector-icons';
import {
  UserIcon,
  EyeSlashIcon,
  SunIcon,
  CalendarDaysIcon,
  MoonIcon,
  ChatBubbleLeftIcon,
  CpuChipIcon,
  UserGroupIcon,
  MicrophoneIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  HeartIcon,
  BoltIcon,
  ArrowPathIcon,
  MapIcon,
  SparklesIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  FilmIcon,
  TvIcon,
  RadioIcon,
  FlagIcon,
  ShieldCheckIcon,
  EyeIcon,
  HandRaisedIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon,
  BuildingLibraryIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  RocketLaunchIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  CheckIcon,
  XMarkIcon,
} from 'react-native-heroicons/solid';

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

type HeroIcon = React.ComponentType<{ color?: string; size?: number }>;

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: Array<{ value: string; label: string; icon?: HeroIcon; brandIcon?: string; brandColor?: string; faIcon?: string }>;
  multiSelect?: boolean;
  maxSelections?: number;
}

// PHASE 1: Questions 1-4
const PHASE_1_QUESTIONS: Question[] = [
  {
    id: 'identity',
    type: 'single',
    question: 'How do you identify?',

    options: [
      { value: 'male', label: 'Male', faIcon: 'mars' },
      { value: 'female', label: 'Female', faIcon: 'venus' },
      { value: 'prefer-not-say', label: 'Prefer not to say', faIcon: 'user-shield' },
    ],
  },
  {
    id: 'cadence',
    type: 'single',
    question: 'How often do you want to reflect or journal?',

    options: [
      { value: 'daily', label: 'Daily', icon: SunIcon },
      { value: 'few-times', label: 'A few times a week', icon: CalendarDaysIcon },
      { value: 'occasionally', label: 'Occasionally', icon: MoonIcon },
    ],
  },
  {
    id: 'source',
    type: 'single',
    question: 'How did you hear about Seneca?',

    options: [
      { value: 'tiktok', label: 'TikTok', brandIcon: 'tiktok', brandColor: '#FFFFFF' },
      { value: 'facebook', label: 'Facebook', brandIcon: 'facebook', brandColor: '#1877F2' },
      { value: 'instagram', label: 'Instagram', brandIcon: 'instagram', brandColor: '#E4405F' },
      { value: 'youtube', label: 'YouTube', brandIcon: 'youtube', brandColor: '#FF0000' },
      { value: 'twitter', label: 'Twitter / X', brandIcon: 'x-twitter', brandColor: '#FFFFFF' },
      { value: 'reddit', label: 'Reddit', brandIcon: 'reddit', brandColor: '#FF4500' },
      { value: 'chatgpt', label: 'ChatGPT / LLMs', icon: CpuChipIcon },
      { value: 'friend', label: 'Friend', icon: UserGroupIcon },
      { value: 'podcast', label: 'Podcast', icon: MicrophoneIcon },
      { value: 'app-store', label: 'App Store', icon: DevicePhoneMobileIcon },
      { value: 'google-search', label: 'Google Search', icon: MagnifyingGlassIcon },
      { value: 'other', label: 'Other', icon: LightBulbIcon },
    ],
  },
  {
    id: 'tried-apps',
    type: 'single',
    question: 'Have you tried any self-improvement or journaling apps before?',

    options: [
      { value: 'yes', label: 'Yes', icon: HandThumbUpIcon },
      { value: 'no', label: 'No', icon: HandThumbDownIcon },
    ],
  },
];

// PHASE 2: Questions 6-10
const PHASE_2_QUESTIONS: Question[] = [
  {
    id: 'mental-state',
    type: 'single',
    question: 'How would you describe your current mental state?',

    options: [
      { value: 'calm', label: 'Calm', icon: HeartIcon },
      { value: 'stressed', label: 'Stressed', icon: BoltIcon },
      { value: 'overthinking', label: 'Overthinking', icon: ArrowPathIcon },
      { value: 'directionless', label: 'Directionless', icon: MapIcon },
    ],
  },
  {
    id: 'birth-year',
    type: 'single',
    question: 'When were you born?',

    options: [
      { value: '1997-2004', label: 'Gen Z (1997-2004)', icon: DevicePhoneMobileIcon },
      { value: '1981-1996', label: 'Millennial (1981-1996)', icon: ComputerDesktopIcon },
      { value: '1965-1980', label: 'Gen X (1965-1980)', icon: FilmIcon },
      { value: '1946-1964', label: 'Baby Boomer (1946-1964)', icon: TvIcon },
      { value: 'before-1946', label: 'Before 1946', icon: RadioIcon },
    ],
  },
  {
    id: 'external-guidance',
    type: 'single',
    question: 'Do you currently work with a coach, therapist, or mentor?',

    options: [
      { value: 'yes', label: 'Yes', icon: CheckIcon },
      { value: 'no', label: 'No', icon: XMarkIcon },
    ],
  },
  {
    id: 'primary-goal',
    type: 'single',
    question: 'What are you here to improve?',

    options: [
      { value: 'discipline', label: 'Discipline', faIcon: 'flag' },
      { value: 'emotional-control', label: 'Emotional control', faIcon: 'shield-halved' },
      { value: 'focus', label: 'Focus', faIcon: 'crosshairs' },
      { value: 'confidence', label: 'Confidence', faIcon: 'hand-fist' },
      { value: 'purpose', label: 'Purpose', faIcon: 'compass' },
    ],
  },
  {
    id: 'desired-state',
    type: 'single',
    question: 'If this works perfectly, how do you want to feel in 90 days?',

    options: [
      { value: 'calm-pressure', label: 'Calm under pressure', faIcon: 'face-smile' },
      { value: 'clear-decisive', label: 'Clear and decisive', faIcon: 'bullseye' },
      { value: 'consistent', label: 'Consistent', faIcon: 'arrow-trend-up' },
      { value: 'grounded', label: 'Grounded', faIcon: 'earth-americas' },
    ],
  },
];

// PHASE 3: Questions 12-16
const PHASE_3_QUESTIONS: Question[] = [
  {
    id: 'pace',
    type: 'single',
    question: 'How fast do you want to change?',

    options: [
      { value: 'gentle', label: 'Gentle', icon: HeartIcon },
      { value: 'recommended', label: 'Recommended', icon: StarIcon },
      { value: 'intense', label: 'Intense', icon: FireIcon },
    ],
  },
  {
    id: 'friction',
    type: 'multi',
    question: 'What usually gets in your way?',

    multiSelect: true,
    options: [
      { value: 'procrastination', label: 'Procrastination', icon: ClockIcon },
      { value: 'overthinking', label: 'Overthinking', icon: ArrowPathIcon },
      { value: 'emotional-reactions', label: 'Emotional reactions', icon: ExclamationTriangleIcon },
      { value: 'inconsistency', label: 'Inconsistency', icon: ArrowTrendingDownIcon },
      { value: 'lack-direction', label: 'Lack of direction', icon: MapIcon },
    ],
  },
  {
    id: 'philosophy',
    type: 'single',
    question: 'Do you follow any philosophy or framework?',

    options: [
      { value: 'stoicism', label: 'Stoicism', icon: BuildingLibraryIcon },
      { value: 'buddhism', label: 'Buddhism', icon: SunIcon },
      { value: 'christianity', label: 'Christianity', icon: BookOpenIcon },
      { value: 'islam', label: 'Islam', icon: MoonIcon },
      { value: 'judaism', label: 'Judaism', icon: StarIcon },
      { value: 'hinduism', label: 'Hinduism', icon: FireIcon },
      { value: 'taoism', label: 'Taoism', icon: ArrowPathIcon },
      { value: 'existentialism', label: 'Existentialism', icon: QuestionMarkCircleIcon },
      { value: 'spiritual', label: 'Spiritual (Non-religious)', icon: SparklesIcon },
      { value: 'none', label: 'None - Just Curious', icon: ChatBubbleLeftIcon },
    ],
  },
  {
    id: 'outcome',
    type: 'single',
    question: 'What would success unlock for you?',

    options: [
      { value: 'relationships', label: 'Better relationships', icon: HeartIcon },
      { value: 'career', label: 'Career focus', icon: RocketLaunchIcon },
      { value: 'peace', label: 'Inner peace', icon: SunIcon },
      { value: 'self-respect', label: 'Self-respect', icon: ShieldCheckIcon },
    ],
  },
];

// PHASE 4: Questions 19-20
const PHASE_4_QUESTIONS: Question[] = [
  {
    id: 'challenge-thinking',
    type: 'single',
    question: 'Do you want Seneca to challenge your thinking?',

    options: [
      { value: 'direct', label: 'Yes, be direct', icon: HandRaisedIcon },
      { value: 'gentle', label: 'Keep it gentle', icon: HeartIcon },
    ],
  },
  {
    id: 'auto-resume',
    type: 'single',
    question: 'If you miss a day, should we send you a reminder?',

    options: [
      { value: 'yes', label: 'Yes, help me resume', icon: CheckIcon },
      { value: 'no', label: "No, I'll restart myself", icon: XMarkIcon },
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
  const scrollRef = useRef<ScrollView>(null);
  const [showMascot, setShowMascot] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

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

  // Stagger fade-in for options
  const MAX_OPTIONS = 15;
  const optionOpacities = useRef(
    Array.from({ length: MAX_OPTIONS }, () => new Animated.Value(1))
  ).current;

  const staggerOptionsIn = useCallback((count: number) => {
    // Reset all to transparent
    optionOpacities.forEach((anim) => anim.setValue(0));
    // Fade each option in with a staggered delay
    for (let i = 0; i < count; i++) {
      Animated.timing(optionOpacities[i], {
        toValue: 1,
        duration: 250,
        delay: i * 100,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Stagger on initial mount
  const hasRunInitialStagger = useRef(false);
  if (!hasRunInitialStagger.current) {
    hasRunInitialStagger.current = true;
    // Set all to 0 initially, then schedule stagger
    optionOpacities.forEach((anim) => anim.setValue(0));
    const count = currentQuestion?.options.length ?? 0;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        Animated.timing(optionOpacities[i], {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }, i * 100);
    }
  }

  // Use overall progress if provided, otherwise calculate local progress
  const progress = overallProgress ?? ((currentStep + 1) / questions.length) * 100;

  // Animate progress bar
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const handleSelect = (optionValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (currentStep < questions.length - 1) {
      const nextStep = currentStep + 1;
      // Hide everything instantly
      fadeAnim.setValue(0);
      optionOpacities.forEach((anim) => anim.setValue(0));
      // Swap content
      setShowMascot(true);
      setCurrentStep(nextStep);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      // Fade in question text, then stagger options
      requestAnimationFrame(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          staggerOptionsIn(questions[nextStep].options.length);
        });
      });
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      fadeAnim.setValue(0);
      optionOpacities.forEach((anim) => anim.setValue(0));
      setShowMascot(true);
      setCurrentStep(prevStep);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      requestAnimationFrame(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          staggerOptionsIn(questions[prevStep].options.length);
        });
      });
    } else {
      onBack();
    }
  };

  return (
    <AppBackground topSafeZone={0}>
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
            <Animated.View style={[styles.progressFill, {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }]} />
          </View>
        </View>

        {/* Question Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {showMascot && phase === 1 && currentStep === 0 && (
              <View style={styles.mascotContainer}>
                <Image
                  source={getSupabaseImageSource('mascot/base-animated_nobg.gif')!}
                  style={styles.mascotImage}
                />
              </View>
            )}
            {showMascot && phase === 1 && currentStep === 1 && (
              <View style={styles.mascotContainer}>
                <Image
                  source={getSupabaseImageSource('mascot/writing-animated_nobg.gif')!}
                  style={styles.mascotImage}
                />
              </View>
            )}
            <Text style={styles.question}>{currentQuestion.question}</Text>

            {(currentQuestion.id === 'identity' ||
              currentQuestion.id === 'cadence' ||
              currentQuestion.id === 'birth-year') && (
              <Text style={styles.subheading}>
                This will be used to calibrate your custom plan
              </Text>
            )}

            {showMascot && currentQuestion.id === 'birth-year' && (
              <View style={styles.mascotContainerLarge}>
                <Image
                  source={getSupabaseImageSource('mascot/calendar-animated_nobg.gif')!}
                  style={styles.mascotImageLarge}
                />
              </View>
            )}

            {currentQuestion.id === 'birth-year' ? (
              <Animated.View style={[styles.optionsContainer, { opacity: optionOpacities[0] }]}>
                <DatePicker
                  onDateChange={(dateStr) => {
                    setAnswers((prev) => ({ ...prev, 'birth-year': dateStr }));
                  }}
                />
              </Animated.View>
            ) : currentQuestion.id === 'mental-state' ? (
              <Animated.View style={[styles.optionsContainer, { opacity: optionOpacities[0] }]}>
                <MoodWheel
                  options={currentQuestion.options}
                  selectedValue={(answers[currentQuestion.id] as string) ?? null}
                  onSelect={handleSelect}
                />
              </Animated.View>
            ) : (
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = isOptionSelected(option.value);
                const isIdentity = currentQuestion.id === 'identity';
                const IconComponent = option.icon;
                return (
                  <Animated.View key={option.value} style={{ opacity: optionOpacities[index] }}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        isSelected && styles.optionButtonHighlightSelected,
                      ]}
                      onPress={() => handleSelect(option.value)}
                      activeOpacity={0.7}
                    >
                      {IconComponent && (
                        <View style={styles.optionIconContainer}>
                          <IconComponent
                            color={isSelected ? theme.colors.primary : theme.colors.quaternary}
                            size={22}
                          />
                        </View>
                      )}
                      {option.brandIcon && (
                        <View style={styles.optionIconContainer}>
                          <FontAwesome6
                            name={option.brandIcon}
                            iconStyle="brand"
                            size={18}
                            color={option.brandColor ?? theme.colors.quaternary}
                          />
                        </View>
                      )}
                      {option.faIcon && !option.brandIcon && (
                        <View style={styles.optionIconContainer}>
                          <FontAwesome6
                            name={option.faIcon}
                            size={18}
                            color={isSelected ? theme.colors.primary : theme.colors.quaternary}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelHighlightSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
            )}

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
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    marginTop: -theme.spacing.sm,
  },
  mascotImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  mascotContainerLarge: {
    alignItems: 'center',
    marginVertical: -12,
  },
  mascotImageLarge: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  question: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    lineHeight: 40,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textTertiary,
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
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
  optionButtonHighlight: {
    justifyContent: 'center',
  },
  optionButtonHighlightSelected: {
    borderColor: theme.colors.quaternary,
    backgroundColor: theme.colors.quaternary,
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  optionLabelHighlight: {
    textAlign: 'center',
  },
  optionLabelHighlightSelected: {
    color: '#000000',
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
