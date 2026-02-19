import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { drawerEvent } from '../utils/drawerEvent';
import {
  getCommunitySnapshot,
  getLiveReflection,
  getQueuedReflections,
  requestReflectionRotation,
} from '../services/reflection.service';
import {
  subscribeLiveReflection,
  subscribeQueuedReflections,
  unsubscribeChannel,
} from '../services/reflection-realtime.service';
import type { CommunityReflection, Reflection } from '../types/reflection.types';
import type { CommunityStackParamList } from '../navigation/CommunityNavigator';
import { getSupabaseImageSource } from '../data/asset-cdn';

type NavigationProp = NativeStackNavigationProp<CommunityStackParamList, 'CommunityMain'>;

export default function CommunityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [liveReflection, setLiveReflection] = useState<CommunityReflection | null>(null);
  const [queuedReflections, setQueuedReflections] = useState<CommunityReflection[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceLiveRender] = useState(0);
  const liveLoadStartMsRef = React.useRef<number | null>(null);
  const loggedLiveLoadedRef = React.useRef(false);
  const liveBackgroundImage = getSupabaseImageSource('images/background-live-reflection.webp');

  const userName = React.useMemo(() => {
    return user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  }, [user?.user_metadata?.name, user?.email]);

  // Open drawer when returning from settings
  useEffect(() => {
    return drawerEvent.listen(() => setShowProfileDrawer(true));
  }, []);

  // Shared function to fetch data
  const fetchData = useCallback(async (source: string = 'unknown', attemptRepair: boolean = true) => {
    console.log(`🔄 Fetching data (source: ${source})...`);

    const snapshotResult = await getCommunitySnapshot(10);

    if (!snapshotResult.error && snapshotResult.data) {
      setLiveReflection(snapshotResult.data.live);
      setQueuedReflections(snapshotResult.data.queued);

      if (
        attemptRepair &&
        !snapshotResult.data.live &&
        snapshotResult.data.queued.length > 0
      ) {
        console.log(`🛠️ [${source}] Queue exists with no live reflection, requesting rotation...`);
        const rotationResult = await requestReflectionRotation();
        if (!rotationResult.error) {
          const repairedSnapshot = await getCommunitySnapshot(10);
          if (!repairedSnapshot.error && repairedSnapshot.data) {
            setLiveReflection(repairedSnapshot.data.live);
            setQueuedReflections(repairedSnapshot.data.queued);
          }
        }
      }

      return;
    }

    const [liveResult, queueResult] = await Promise.all([getLiveReflection(), getQueuedReflections(10)]);

    console.log(`📊 [${source}] Live:`, {
      hasData: !!liveResult.data,
      id: liveResult.data?.id,
      status: liveResult.data?.status,
    });
    console.log(`📊 [${source}] Queue:`, { count: queueResult.data?.length || 0 });

    if (!liveResult.error) {
      setLiveReflection(liveResult.data || null);
    }

    if (!queueResult.error && queueResult.data) {
      setQueuedReflections(queueResult.data);
    }
  }, []);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData('pull-to-refresh');
    setRefreshing(false);
  }, [fetchData]);

  // Refresh data whenever this screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      fetchData('focus');
    }, [fetchData])
  );

  const toCommunityReflection = useCallback((reflection: Reflection): CommunityReflection => {
    return {
      id: reflection.id,
      display_name: reflection.display_name,
      input_text: reflection.input_text,
      generated_text: reflection.generated_text,
      status: reflection.status,
      queued_at: reflection.queued_at,
      live_started_at: reflection.live_started_at,
      live_until: reflection.live_until,
      completed_at: reflection.completed_at,
    };
  }, []);

  // Load initial data and start polling
  useEffect(() => {
    const loadData = async () => {
      await fetchData('initial-load');
      setLoading(false);
    };

    loadData();

    const liveChannel = subscribeLiveReflection((reflection) => {
      setLiveReflection(reflection ? toCommunityReflection(reflection) : null);
    });
    const queueChannel = subscribeQueuedReflections((reflections) => {
      setQueuedReflections(reflections);
    }, 10);

    // Slow polling fallback in case realtime disconnects
    console.log('⏰ Starting fallback polling (every 60 seconds)');
    const pollInterval = setInterval(() => {
      fetchData('poll-fallback');
    }, 60000); // 60 seconds

    return () => {
      console.log('⏹️ Stopping polling');
      clearInterval(pollInterval);
      unsubscribeChannel(liveChannel);
      unsubscribeChannel(queueChannel);
    };
  }, [fetchData, toCommunityReflection]);

  // Auto-fetch when timer expires
  useEffect(() => {
    if (timeRemaining === 0 && liveReflection) {
      console.log('⏰ Timer expired, fetching next reflection...');
      // Wait a moment for the cron job to update, then fetch
      setTimeout(async () => {
        await requestReflectionRotation();
        fetchData('timer-expired');
      }, 2000); // Wait 2 seconds for cron job to process
    }
  }, [timeRemaining, liveReflection, fetchData]);

  // Countdown timer for live reflection
  useEffect(() => {
    if (!liveReflection || !liveReflection.live_until) return;

    const updateTimer = () => {
      const now = new Date();
      const until = new Date(liveReflection.live_until!);
      const diff = Math.max(0, until.getTime() - now.getTime());
      setTimeRemaining(Math.floor(diff / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [liveReflection]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Ending soon...';
    return `${seconds}s left`;
  };

  const getEstimatedWaitTime = (position: number): string => {
    if (position === 0) return 'Starts Next';
    const minutes = position;
    return `Starts in ~${minutes} min`;
  };

  const getReflectionPreview = (reflection: CommunityReflection): string => {
    return reflection.generated_text?.trim() || reflection.input_text;
  };

  const navigateToLiveReflection = useCallback(
    (reflectionId: string, initialReflection?: CommunityReflection) => {
      const mainNavigator = navigation.getParent()?.getParent();
      if (mainNavigator) {
        (mainNavigator as any).navigate('LiveReflectionDetail', {
          reflectionId,
          initialReflection,
        });
      }
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ProfileAvatar name={userName} onPress={() => setShowProfileDrawer(true)} />
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity
            style={styles.myReflectionsButton}
            onPress={() => navigation.navigate('MyReflections')}
          >
            <Text style={styles.myReflectionsText}>✍️</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* Right Now (Live Section) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Right Now</Text>
              {liveReflection ? (
                <View style={styles.liveCard}>
                  {liveBackgroundImage ? (
                    <ImageBackground
                      source={liveBackgroundImage}
                      style={styles.liveBackgroundImage}
                      imageStyle={styles.liveBackgroundImageStyle}
                      resizeMode="cover"
                      onLoadStart={() => {
                        liveLoadStartMsRef.current = Date.now();
                      }}
                      onLoad={() => {
                        if (loggedLiveLoadedRef.current) return;
                        const startMs = liveLoadStartMsRef.current;
                        const elapsedMs = startMs ? Date.now() - startMs : -1;
                        console.log('[Community] Live background loaded', { elapsedMs });
                        loggedLiveLoadedRef.current = true;
                        forceLiveRender((v) => v + 1);
                      }}
                    >
                      <View style={styles.liveOverlay}>
                        <View style={styles.liveHeader}>
                          <Text style={styles.username}>{liveReflection.display_name}</Text>
                          <Text style={styles.timeLeft}>{formatTimeRemaining(timeRemaining)}</Text>
                        </View>

                        <Text style={styles.request} numberOfLines={2}>
                          {getReflectionPreview(liveReflection)}
                        </Text>

                        <TouchableOpacity
                          style={styles.joinButton}
                          onPress={() => navigateToLiveReflection(liveReflection.id, liveReflection)}
                        >
                          <Text style={styles.joinButtonText}>View Live Reflection</Text>
                        </TouchableOpacity>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={[styles.liveBackgroundImage, styles.liveBackgroundFallback]}>
                      <View style={styles.liveOverlay}>
                        <View style={styles.liveHeader}>
                          <Text style={styles.username}>{liveReflection.display_name}</Text>
                          <Text style={styles.timeLeft}>{formatTimeRemaining(timeRemaining)}</Text>
                        </View>

                        <Text style={styles.request} numberOfLines={2}>
                          {getReflectionPreview(liveReflection)}
                        </Text>

                        <TouchableOpacity
                          style={styles.joinButton}
                          onPress={() => navigateToLiveReflection(liveReflection.id, liveReflection)}
                        >
                          <Text style={styles.joinButtonText}>View Live Reflection</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No live reflection at the moment</Text>
                  <Text style={styles.emptySubtext}>Check back soon!</Text>
                </View>
              )}
            </View>

            {/* In Waiting (Queue Section) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>In Waiting</Text>
              <Text style={styles.sectionSubtitle}>
                {queuedReflections.length} REFLECTION{queuedReflections.length !== 1 ? 'S' : ''}
              </Text>

              {queuedReflections.length > 0 ? (
                queuedReflections.map((reflection, index) => (
                  <View key={reflection.id} style={styles.waitingCard}>
                    <View style={styles.waitingHeader}>
                      <Text style={styles.username}>{reflection.display_name}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{getEstimatedWaitTime(index)}</Text>
                      </View>
                    </View>

                    <Text style={styles.request} numberOfLines={2}>
                      {getReflectionPreview(reflection)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Queue is empty</Text>
                  <Text style={styles.emptySubtext}>Be the first to share a thought!</Text>
                </View>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Live Reflections</Text>
              <Text style={styles.infoText}>
                Share your thoughts and watch as they become Stoic reflections. Each reflection is
                live for 60 seconds, creating a shared moment of wisdom with the community.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ShareThought')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ProfileDrawer visible={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
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
  content: {
    paddingBottom: 100, // Extra padding for FAB
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  myReflectionsButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myReflectionsText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  liveCard: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  liveBackgroundImage: {
    width: '100%',
    minHeight: 200,
  },
  liveBackgroundImageStyle: {
    borderRadius: theme.borderRadius.lg,
  },
  liveBackgroundFallback: {
    backgroundColor: '#2C4259',
  },
  liveOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: theme.spacing.lg,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  username: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeLeft: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  request: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  waitingCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  waitingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: theme.colors.background,
    fontWeight: '300',
  },
});
