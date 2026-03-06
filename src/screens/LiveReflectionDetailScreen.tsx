import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import { XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from 'react-native-heroicons/solid';
import { theme } from '../theme';
import { isSoundEnabled } from '../hooks/useAppPreferences';
import { getReflectionById } from '../services/reflection.service';
import { subscribeToReflection, unsubscribeChannel } from '../services/reflection-realtime.service';
import type { CommunityReflection, Reflection } from '../types/reflection.types';
import type { MainStackParamList } from '../navigation/MainNavigator';
import dayjs from 'dayjs';
import { getSupabaseAudioSource } from '../data/asset-cdn';
import { AnimatedMeshGradient } from '../components/AnimatedMeshGradient';

type RouteParams = RouteProp<MainStackParamList, 'LiveReflectionDetail'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ambientSource = getSupabaseAudioSource('audio/ambient-loop.mp3');

export default function LiveReflectionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { reflectionId, initialReflection } = route.params;

  const [reflection, setReflection] = useState<Reflection | CommunityReflection | null>(
    initialReflection || null
  );
  const [loading, setLoading] = useState(!initialReflection);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const soundEnabled = isSoundEnabled();

  const player = useAudioPlayer(soundEnabled && ambientSource ? { uri: ambientSource } : null);

  // Start playback when player is ready
  useEffect(() => {
    if (!player || !soundEnabled) return;
    try {
      player.loop = true;
      player.volume = 0.3;
      player.play();
    } catch (error) {
      console.log('Audio playback failed (expected if audio file not yet added):', error);
    }
  }, [player, soundEnabled]);

  // Load reflection
  useEffect(() => {
    let isMounted = true;

    const loadReflection = async () => {
      const { data, error } = await getReflectionById(reflectionId);
      if (isMounted && !error && data) {
        setReflection(data);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    loadReflection();

    // Subscribe to updates
    const channel = subscribeToReflection(reflectionId, (updatedReflection) => {
      setReflection(updatedReflection);
    });

    return () => {
      isMounted = false;
      unsubscribeChannel(channel);
    };
  }, [reflectionId]);

  // Countdown timer
  useEffect(() => {
    if (!reflection || !reflection.live_until) return;

    const updateTimer = () => {
      const now = new Date();
      const until = new Date(reflection.live_until!);
      const diff = Math.max(0, until.getTime() - now.getTime());
      setTimeRemaining(Math.floor(diff / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [reflection]);

  // Mute toggle
  const toggleMute = () => {
    if (player) {
      const newMuted = !isMuted;
      player.volume = newMuted ? 0 : 0.3;
      setIsMuted(newMuted);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.fullScreen}>
        <AnimatedMeshGradient
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          borderRadius={0}
          baseColors={['#151535', '#2A1A5E']}
          blobColors={['#5C8EDE', '#9E7ABB']}
          duration={12000}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!reflection) {
    return (
      <View style={styles.fullScreen}>
        <AnimatedMeshGradient
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          borderRadius={0}
          baseColors={['#151535', '#2A1A5E']}
          blobColors={['#5C8EDE', '#9E7ABB']}
          duration={12000}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Reflection not found</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        borderRadius={0}
        baseColors={['#151535', '#2A1A5E']}
        blobColors={['#5C8EDE', '#9E7ABB']}
        duration={12000}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <XMarkIcon size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
            {isMuted ? (
              <SpeakerXMarkIcon size={20} color="#FFFFFF" />
            ) : (
              <SpeakerWaveIcon size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Live badge */}
            {reflection.status === 'live' && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            )}

            {/* Display Name */}
            <Text style={styles.displayName}>{reflection.display_name}</Text>

            {/* Original Thought */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Original Thought</Text>
              <Text style={styles.inputText}>"{reflection.input_text}"</Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDiamond} />
              <View style={styles.dividerLine} />
            </View>

            {/* Generated Reflection */}
            <Text style={styles.reflectionText}>{reflection.generated_text}</Text>

            {/* Timer */}
            {reflection.status === 'live' && timeRemaining > 0 && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Time Remaining</Text>
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              </View>
            )}

            {/* Status */}
            {reflection.status !== 'live' && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  {reflection.status === 'completed'
                    ? `Completed ${dayjs(reflection.completed_at).fromNow()}`
                    : 'In Queue'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#151535',
  },
  safeArea: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.lg,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  displayName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  inputText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 12,
  },
  reflectionText: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '400',
  },
  timerContainer: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  statusContainer: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  statusText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
