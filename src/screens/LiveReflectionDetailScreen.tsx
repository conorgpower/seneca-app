import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import { theme } from '../theme';
import { isSoundEnabled } from '../hooks/useAppPreferences';
import { getReflectionById } from '../services/reflection.service';
import { subscribeToReflection, unsubscribeChannel } from '../services/reflection-realtime.service';
import type { CommunityReflection, Reflection } from '../types/reflection.types';
import type { MainStackParamList } from '../navigation/MainNavigator';
import dayjs from 'dayjs';
import { getSupabaseAudioSource } from '../data/asset-cdn';

type RouteParams = RouteProp<MainStackParamList, 'LiveReflectionDetail'>;

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reflection) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Reflection not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#0f3460', '#16213e']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
            <Text style={styles.muteButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Display Name */}
            <Text style={styles.displayName}>{reflection.display_name}</Text>

            {/* Original Thought */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Original Thought</Text>
              <Text style={styles.inputText}>"{reflection.input_text}"</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

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
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  inputText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: theme.spacing.xl,
  },
  reflectionText: {
    fontSize: theme.typography.sizes.lg,
    color: '#ffffff',
    lineHeight: 32,
    textAlign: 'center',
  },
  timerContainer: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  timerText: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusContainer: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  statusText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
