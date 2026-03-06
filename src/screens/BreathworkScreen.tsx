import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSharedValue, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { theme } from '../theme';
import { isSoundEnabled } from '../hooks/useAppPreferences';
import { getSupabaseAudioSource } from '../data/asset-cdn';
import type { MainStackParamList } from '../navigation/MainNavigator';
import {
  getBreathworkExerciseById,
  getCycleDuration,
  getPhaseLabel,
} from '../data/breathwork-exercises';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from 'react-native-heroicons/solid';
import BreathingCircles from '../components/BreathingCircles';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { useAchievementCheck } from '../hooks/useAchievementCheck';

type ScreenRoute = RouteProp<MainStackParamList, 'Breathwork'>;
type ScreenNav = NativeStackNavigationProp<MainStackParamList, 'Breathwork'>;

const ACCENT = '#5BBFAD';
const BG = '#142C29';
const BG_CARD = '#1E3B37';

const ambientSource = getSupabaseAudioSource('audio/ambient-loop.mp3');

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function BreathworkScreen() {
  const navigation = useNavigation<ScreenNav>();
  const route = useRoute<ScreenRoute>();
  const { exerciseId } = route.params;

  const { logContentAndCheck } = useAchievementCheck();
  const exercise = useMemo(() => getBreathworkExerciseById(exerciseId), [exerciseId]);
  const cycleDuration = useMemo(() => (exercise ? getCycleDuration(exercise) : 0), [exercise]);
  const totalSeconds = useMemo(() => (exercise ? exercise.durationMinutes * 60 : 0), [exercise]);

  const expansionProgress = useSharedValue(0);

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [phaseCountdown, setPhaseCountdown] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Ambient audio
  const soundEnabled = isSoundEnabled();
  const player = useAudioPlayer(soundEnabled && ambientSource ? { uri: ambientSource } : null);

  useEffect(() => {
    if (!player || !soundEnabled) return;
    try {
      player.loop = true;
      player.volume = 0.3;
      player.play();
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, [player, soundEnabled]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    setIsMuted((prev) => {
      player.volume = prev ? 0.3 : 0;
      return !prev;
    });
  }, [player]);

  // Refs for the state machine
  const phaseIndexRef = useRef(0);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartTimeRef = useRef(0);
  const remainingMsRef = useRef(0);
  const targetExpansionRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      cancelAnimation(expansionProgress);
    };
  }, [clearTimers, expansionProgress]);

  const startCountdown = useCallback((durationSec: number) => {
    setPhaseCountdown(durationSec);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil(durationSec - elapsedMs / 1000));
      setPhaseCountdown(remaining);
      if (remaining <= 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 200);
  }, []);

  const runPhase = useCallback(
    (phaseIdx: number) => {
      if (!exercise) return;

      const phase = exercise.phases[phaseIdx];
      phaseIndexRef.current = phaseIdx;
      setPhaseLabel(getPhaseLabel(phase.phase));
      startCountdown(phase.durationSeconds);

      const durationMs = phase.durationSeconds * 1000;
      phaseStartTimeRef.current = Date.now();
      remainingMsRef.current = durationMs;

      // Haptic tick on phase change
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Drive animation
      if (phase.phase === 'inhale') {
        const target = phase.targetExpansion ?? 1;
        targetExpansionRef.current = target;
        expansionProgress.value = withTiming(target, {
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
        });
      } else if (phase.phase === 'exhale') {
        targetExpansionRef.current = 0;
        expansionProgress.value = withTiming(0, {
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
        });
      }
      // hold / holdAfterExhale: no animation change

      // Schedule next phase
      phaseTimeoutRef.current = setTimeout(() => {
        const nextIdx = (phaseIdx + 1) % exercise.phases.length;
        const isNewCycle = nextIdx === 0;

        if (isNewCycle) {
          // Check if exercise is complete
          setElapsed((prev) => {
            if (prev + cycleDuration >= totalSeconds) {
              // Complete
              setIsRunning(false);
              setIsComplete(true);
              setPhaseCountdown(null);
              clearTimers();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              return totalSeconds;
            }
            return prev;
          });
        }

        // If still running, continue to next phase
        setIsRunning((running) => {
          if (running) runPhase(nextIdx);
          return running;
        });
      }, durationMs);
    },
    [exercise, expansionProgress, cycleDuration, totalSeconds, clearTimers, startCountdown],
  );

  const startExercise = useCallback(() => {
    if (!exercise) return;
    logContentAndCheck('breathwork', exerciseId);
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
    setElapsed(0);
    expansionProgress.value = 0;

    // Start elapsed timer
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          return totalSeconds;
        }
        return next;
      });
    }, 1000);

    // Start first phase
    runPhase(0);
  }, [exercise, expansionProgress, totalSeconds, runPhase]);

  const pauseExercise = useCallback(() => {
    setIsPaused(true);

    // Calculate remaining time in current phase
    const elapsedInPhase = Date.now() - phaseStartTimeRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsedInPhase);

    // Stop timers
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Cancel ongoing animation
    cancelAnimation(expansionProgress);
  }, [expansionProgress]);

  const resumeExercise = useCallback(() => {
    if (!exercise) return;
    setIsPaused(false);

    const remaining = remainingMsRef.current;
    const phaseIdx = phaseIndexRef.current;
    const phase = exercise.phases[phaseIdx];

    phaseStartTimeRef.current = Date.now();
    startCountdown(Math.ceil(remaining / 1000));

    // Restart elapsed timer
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) return totalSeconds;
        return next;
      });
    }, 1000);

    // Resume animation from current position
    if (phase.phase === 'inhale') {
      const target = phase.targetExpansion ?? 1;
      expansionProgress.value = withTiming(target, {
        duration: remaining,
        easing: Easing.inOut(Easing.sin),
      });
    } else if (phase.phase === 'exhale') {
      expansionProgress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.inOut(Easing.sin),
      });
    }

    // Resume phase timeout
    phaseTimeoutRef.current = setTimeout(() => {
      const nextIdx = (phaseIdx + 1) % exercise.phases.length;
      const isNewCycle = nextIdx === 0;

      if (isNewCycle) {
        setElapsed((prev) => {
          if (prev + cycleDuration >= totalSeconds) {
            setIsRunning(false);
            setIsComplete(true);
            setPhaseCountdown(null);
            clearTimers();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            return totalSeconds;
          }
          return prev;
        });
      }

      setIsRunning((running) => {
        if (running) runPhase(nextIdx);
        return running;
      });
    }, remaining);
  }, [exercise, expansionProgress, totalSeconds, cycleDuration, clearTimers, runPhase, startCountdown]);

  const handleClose = useCallback(() => {
    clearTimers();
    cancelAnimation(expansionProgress);
    navigation.goBack();
  }, [clearTimers, expansionProgress, navigation]);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Exercise not found.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;

  // Completion state
  if (isComplete) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.xButton} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.xButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.completeContent}>
            <View style={styles.completeCheckWrap}>
              <Text style={styles.completeCheck}>✓</Text>
            </View>
            <Text style={styles.completeTitle}>Session Complete</Text>
            <Text style={styles.completeDescription}>
              {exercise.durationMinutes} minutes of {exercise.title.toLowerCase()}. Well done.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top row: spacer + title + close */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.xButton} onPress={toggleMute} activeOpacity={0.8}>
            {isMuted ? <SpeakerXMarkIcon size={18} color="#FFFFFF" /> : <SpeakerWaveIcon size={18} color="#FFFFFF" />}
          </TouchableOpacity>
          <View style={styles.titleArea}>
            <Text style={styles.title}>{exercise.title}</Text>
            <Text style={styles.subtitle}>{exercise.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.xButton} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.xButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Breathing animation — takes all remaining space */}
        <View style={styles.circlesWrap}>
          <BreathingCircles
            expansionProgress={expansionProgress}
            phaseLabel={isRunning ? phaseLabel : 'Ready'}
            phaseCountdown={isRunning && !isPaused ? phaseCountdown : null}
            isHolding={isRunning && (isPaused || phaseLabel === 'Hold')}
          />
        </View>

        {/* Bottom area: progress + controls */}
        <View style={styles.bottomArea}>
          <View style={styles.progressWrap}>
            <AnimatedProgressBar
              progress={progress}
              height={4}
              trackColor={BG_CARD}
              fillColor={ACCENT}
              fillColorSecondary="#6ECEBE"
            />
            <Text style={styles.elapsedBig}>{formatClock(elapsed)}</Text>
          </View>

          <View style={styles.controls}>
            {!isRunning ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={startExercise}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={isPaused ? resumeExercise : pauseExercise}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    marginBottom: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  xButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_CARD,
  },
  xButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  circlesWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    paddingBottom: theme.spacing.md,
  },
  progressWrap: {
    marginBottom: theme.spacing.lg,
  },
  elapsedBig: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    letterSpacing: 2,
  },
  controls: {},
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCheckWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  completeCheck: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  completeTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  completeDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});
