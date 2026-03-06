import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setIsAudioActiveAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { theme } from '../theme';
import { XMarkIcon, SpeakerWaveIcon, PlayIcon, PauseIcon } from 'react-native-heroicons/solid';
import type { MainStackParamList } from '../navigation/MainNavigator';
import {
  getAudioLessonById,
  getAudioLessonFallbackSource,
  getAudioLessonPrimarySource,
} from '../data/audio-lessons';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { useAchievementCheck } from '../hooks/useAchievementCheck';

type AudioLessonRoute = RouteProp<MainStackParamList, 'AudioLesson'>;
type AudioLessonNavigationProp = NativeStackNavigationProp<MainStackParamList, 'AudioLesson'>;

function formatClock(totalSeconds: number | undefined): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function AudioLessonScreen() {
  const navigation = useNavigation<AudioLessonNavigationProp>();
  const route = useRoute<AudioLessonRoute>();
  const { lessonId } = route.params;
  const { logContentAndCheck } = useAchievementCheck();
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFallbackRef = useRef(false);
  const statusRef = useRef({ playing: false, currentTime: 0 });

  const lesson = useMemo(() => getAudioLessonById(lessonId), [lessonId]);
  const primarySource = useMemo(() => getAudioLessonPrimarySource(lessonId), [lessonId]);
  const fallbackSource = useMemo(() => getAudioLessonFallbackSource(lessonId), [lessonId]);

  useEffect(() => {
    statusRef.current = {
      playing: status.playing,
      currentTime: status.currentTime || 0,
    };
  }, [status.playing, status.currentTime]);

  useEffect(() => {
    if (!lesson || !primarySource) return;

    didFallbackRef.current = false;
    setIsAudioActiveAsync(true).catch(() => undefined);
    logContentAndCheck('audio_lesson', lessonId);
    try {
      player.replace(primarySource);
      player.play();
    } catch (error) {
      console.warn('[AudioLesson] Failed to start primary source', { lessonId, error });
    }

    fallbackTimerRef.current = setTimeout(() => {
      if (didFallbackRef.current) return;
      if (statusRef.current.playing || statusRef.current.currentTime > 0) return;
      if (!fallbackSource) return;
      didFallbackRef.current = true;
      console.warn('[AudioLesson] Primary source stalled, falling back to local', { lessonId });
      try {
        player.replace(fallbackSource);
        player.play();
      } catch (error) {
        console.warn('[AudioLesson] Failed to start fallback source', { lessonId, error });
      }
    }, 2500);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [lessonId, lesson, primarySource, fallbackSource, player]);

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Lesson not found.</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const handleSeek = useCallback(
    (p: number) => {
      if (duration > 0) {
        player.seekTo(p * duration);
      }
    },
    [player, duration],
  );

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.secondary, theme.colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.xButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <XMarkIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <SpeakerWaveIcon size={48} color={theme.colors.secondary} />
            </View>
            <Text style={styles.title}>{lesson.title}</Text>
            <Text style={styles.description}>{lesson.description}</Text>
          </View>

          <View style={styles.progressWrap}>
            <AnimatedProgressBar
              progress={progress}
              height={8}
              trackColor={theme.colors.backgroundCard}
              fillColor={theme.colors.primary}
              fillColorSecondary="#E8C06A"
              onSeek={handleSeek}
            />
            <Text style={styles.elapsedBig}>{formatClock(currentTime)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => player.seekTo(Math.max(0, currentTime - 15))}
            >
              <Text style={styles.controlButtonText}>↺ 15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={async () => {
                await setIsAudioActiveAsync(true).catch(() => undefined);
                try {
                  if (status.playing) player.pause();
                  else player.play();
                } catch (error) {
                  console.warn('[AudioLesson] Play/pause action failed', { lessonId, error });
                }
              }}
            >
              {status.playing ? <PauseIcon size={24} color={theme.colors.secondary} /> : <PlayIcon size={24} color={theme.colors.secondary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => player.seekTo(Math.max(0, currentTime + 15))}
            >
              <Text style={styles.controlButtonText}>15s ↻</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  xButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  hero: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.quaternary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  progressWrap: {
    marginBottom: theme.spacing.md,
  },
  elapsedBig: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  controlButton: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  controlButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  playPauseButton: {
    flex: 1.2,
    backgroundColor: theme.colors.quaternary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  playPauseText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
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
  closeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: theme.typography.sizes.md,
  },
});
