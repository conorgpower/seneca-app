import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Image,
  ImageBackground,
  InteractionManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import { TodayStackParamList } from '../navigation/TodayNavigator';
import type { MainStackParamList } from '../navigation/MainNavigator';
import {
  getDailyWidgetQuote,
  PhilosophicalQuote,
} from '../services/philosophical-quotes.service';
import { getDailyPassage } from '../services/philosophical-passages.service';
import { updateWisdomWidget, updateWidgetBackgroundImages } from '../services/home-widget.service';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  FireIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  PencilSquareIcon,
  LockClosedIcon,
  ArrowUpRightIcon,
} from 'react-native-heroicons/solid';
import { drawerEvent } from '../utils/drawerEvent';
import { COMICS, getComicCoverSources } from '../data/comics';
import { getSupabaseImageSource } from '../data/asset-cdn';
import * as TodayService from '../services/today.service';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { AnimatedMeshGradient } from '../components/AnimatedMeshGradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - theme.spacing.lg * 2;
const EXPANDED_CARD_HEIGHT = 220;

type TodayScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TodayStackParamList, 'TodayMain'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const PASSAGE_BG_IMAGE = getSupabaseImageSource('images/passage-of-day.webp');
const WISDOM_BG_IMAGE = getSupabaseImageSource('images/background-quote-2.webp');
const REMINDER_FIRST_PROMPT_KEY = '@seneca_reminder_first_prompted';

function prefetchRemoteSource(source: { uri?: string } | null) {
  if (!source?.uri) return;
  Image.prefetch(source.uri).catch(() => undefined);
}

async function prefetchRemoteSourceAsync(source: { uri?: string } | null) {
  if (!source?.uri) return;
  try {
    await Image.prefetch(source.uri);
  } catch {
    // Best-effort background warmup.
  }
}

export default function TodayScreen() {
  const navigation = useNavigation<TodayScreenNavigationProp>();
  const { user } = useAuth();
  const { todayProgress, currentStreak, weeklyCompletions, dailyQuote, refreshProgress } = useToday();
  const [expandedRitual, setExpandedRitual] = useState<string | null>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [smallWidgetQuote, setSmallWidgetQuote] = useState<PhilosophicalQuote | null>(null);
  const [largeWidgetQuote, setLargeWidgetQuote] = useState<PhilosophicalQuote | null>(null);
  const [lockWidgetQuote, setLockWidgetQuote] = useState<PhilosophicalQuote | null>(null);
  const [, forceImageRender] = useState(0);
  const imageLoadStartMsRef = useRef<Record<string, number>>({});
  const imageLoggedRef = useRef<Record<string, boolean>>({});
  const hasCheckedReminderPromptRef = useRef(false);

  // Animation values for each ritual
  const animationValues = useRef({
    checkin: new Animated.Value(0),
    passage: new Animated.Value(0),
    insight: new Animated.Value(0),
  }).current;

  const streakCount = currentStreak?.current_streak || 0;
  const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDateStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();
  const userName = React.useMemo(() => {
    return user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  }, [user?.user_metadata?.name, user?.email]);

  // Open drawer when returning from settings
  // Open drawer when returning from settings — only while this tab is focused
  useFocusEffect(
    useCallback(() => {
      return drawerEvent.listen(() => setShowProfileDrawer(true));
    }, [])
  );

  // Fetch widget-specific quotes on mount (different length pools)
  useEffect(() => {
    const fetchWidgetQuotes = async () => {
      const [smallQuote, largeQuote, lockQuote] = await Promise.all([
        getDailyWidgetQuote(72),
        getDailyWidgetQuote(150),
        getDailyWidgetQuote(80),
      ]);
      setSmallWidgetQuote(smallQuote);
      setLargeWidgetQuote(largeQuote);
      setLockWidgetQuote(lockQuote);
    };
    fetchWidgetQuotes();
  }, []);

  useEffect(() => {
    updateWisdomWidget({
      small: {
        quoteText: smallWidgetQuote?.quote_text,
        author: smallWidgetQuote?.author,
      },
      large: {
        quoteText: largeWidgetQuote?.quote_text,
        author: largeWidgetQuote?.author,
      },
      lock: {
        quoteText: lockWidgetQuote?.quote_text,
        author: lockWidgetQuote?.author,
      },
    });
    updateWidgetBackgroundImages();
  }, [
    smallWidgetQuote?.quote_text,
    smallWidgetQuote?.author,
    largeWidgetQuote?.quote_text,
    largeWidgetQuote?.author,
    lockWidgetQuote?.quote_text,
    lockWidgetQuote?.author,
  ]);

  useEffect(() => {
    // Highest priority: warm the two hero images used on Today.
    prefetchRemoteSource(PASSAGE_BG_IMAGE as { uri?: string } | null);
    prefetchRemoteSource(WISDOM_BG_IMAGE as { uri?: string } | null);

    // After Today has painted and user has been idle briefly,
    // do a very small warmup (not full-library prefetch).
    let cancelled = false;
    let warmupTimer: ReturnType<typeof setTimeout> | null = null;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      warmupTimer = setTimeout(async () => {
        const comicsForWarmup = COMICS.slice(0, 1);
        for (const comic of comicsForWarmup) {
          if (cancelled) break;
          const { primary } = getComicCoverSources(comic.id);
          await prefetchRemoteSourceAsync(primary as { uri?: string } | null);
        }
      }, 5000);
    });

    return () => {
      cancelled = true;
      if (warmupTimer) clearTimeout(warmupTimer);
      interactionTask.cancel();
    };
  }, []);

  useEffect(() => {
    hasCheckedReminderPromptRef.current = false;
  }, [user?.id]);

  // Refresh progress when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshProgress();

      const maybePromptReminderSetup = async () => {
        if (!user?.id || hasCheckedReminderPromptRef.current) return;
        hasCheckedReminderPromptRef.current = true;

        const perUserPromptKey = `${REMINDER_FIRST_PROMPT_KEY}:${user.id}`;
        const alreadyPrompted = await AsyncStorage.getItem(perUserPromptKey);
        if (alreadyPrompted) return;

        const { data: reminderData, error } = await TodayService.getUserReminder(user.id);
        if (error) {
          console.error('Error checking reminder status for first prompt:', error);
          return;
        }

        if (reminderData?.enabled) {
          await AsyncStorage.setItem(perUserPromptKey, '1');
          return;
        }

        Alert.alert(
          'Keep your streak going',
          'Enable daily reminders to keep your streak alive.',
          [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: () => {
                AsyncStorage.setItem(perUserPromptKey, '1').catch(() => undefined);
              },
            },
            {
              text: 'Enable reminders',
              onPress: () => {
                AsyncStorage.setItem(perUserPromptKey, '1').catch(() => undefined);
                navigation.navigate('Reminder');
              },
            },
          ]
        );
      };

      maybePromptReminderSetup().catch((error) => {
        console.error('Failed to show reminder prompt:', error);
      });
    }, [navigation, refreshProgress, user?.id])
  );

  const ritualIconMap: Record<string, React.ReactNode> = {
    fire: <FireIcon size={28} color="#FFFFFF" />,
    book: <BookOpenIcon size={28} color="#FFFFFF" />,
    pencil: <PencilSquareIcon size={28} color="#FFFFFF" />,
  };

  const dailyRituals = [
    {
      id: 'checkin',
      title: 'DAILY CHECK-IN',
      duration: '1 MIN',
      icon: 'fire',
      completed: todayProgress?.checkInCompleted || false,
      prompt: 'How steady do you feel today?',
      colors: ['#0F2E2E', '#1A3D3D'],
      mesh: {
        baseColors: ['#0F2E2E', '#1A3D3D'] as [string, string],
        blobColors: ['#6EECD0', '#42C8A8'] as [string, string],
      },
      onPress: () => navigation.navigate('CheckIn'),
    },
    {
      id: 'passage',
      title: 'PASSAGE OF THE DAY',
      duration: '1 MIN',
      icon: 'book',
      completed: todayProgress?.passageCompleted || false,
      prompt: 'Read and reflect on today\'s philosophical passage',
      colors: ['#4A90A4', '#2E7D8F', '#1B5E6F'],
      onPress: () => navigation.navigate('Passage', { checkInValue: 50 }),
    },
    {
      id: 'insight',
      title: 'PERSONALIZED INSIGHT',
      duration: '3 MIN',
      icon: 'pencil',
      completed: todayProgress?.insightCompleted || false,
      prompt: 'Discover how today\'s wisdom applies to you',
      colors: ['#151535', '#2A1A5E'],
      mesh: {
        baseColors: ['#151535', '#2A1A5E'] as [string, string],
        blobColors: ['#5C8EDE', '#9E7ABB'] as [string, string],
      },
      onPress: async () => {
        const passage = await getDailyPassage();
        if (passage && passage.reflection) {
          navigation.navigate('Insight', {
            passageId: passage.id,
            reflection: passage.reflection,
          });
        } else {
          // If no reflection available, go to Passage screen
          navigation.navigate('Passage', { checkInValue: 50 });
        }
      },
    },
  ];

  const toggleExpanded = (id: string) => {
    const isCurrentlyExpanded = expandedRitual === id;
    const newExpandedState = isCurrentlyExpanded ? null : id;

    // If there's a previously expanded ritual that's different, collapse it
    if (expandedRitual && expandedRitual !== id) {
      Animated.timing(animationValues[expandedRitual as keyof typeof animationValues], {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    }

    // Animate the ritual being toggled
    Animated.timing(animationValues[id as keyof typeof animationValues], {
      toValue: isCurrentlyExpanded ? 0 : 1,
      duration: 500,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    setExpandedRitual(newExpandedState);
  };

  const progress = todayProgress?.progressPercentage || 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ProfileAvatar
            name={userName}
            avatarUrl={user?.user_metadata?.avatar_url}
            onPress={() => setShowProfileDrawer(true)}
          />
          <View style={styles.header}>
            <Text style={styles.title}>Today's Journey</Text>
          </View>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => navigation.navigate('Calendar')}
          >
            <FireIcon size={18} color={theme.colors.primary} />
            <Text style={styles.streakNumber}>{streakCount}</Text>
            <Text style={styles.buttonDivider}>|</Text>
            <CalendarDaysIcon size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

      {/* Weekly Dots */}
      <View style={styles.streakContainer}>
        <View style={styles.weekContainer}>
          {WEEKDAY_LABELS.map((label, index) => {
            const dayData = weeklyCompletions[index];
            const dateNum = dayData ? parseInt(dayData.date.split('-')[2], 10) : null;
            const isPast = dayData && !dayData.isToday && dayData.date < todayDateStr;
            const isFuture = dayData && !dayData.isToday && dayData.date > todayDateStr;

            return (
              <View key={index} style={styles.dayColumn}>
                <Text style={[styles.dayLabel, dayData?.isToday && styles.dayLabelToday]}>
                  {label}
                </Text>
                <View style={styles.dayCircleWrapper}>
                  <View style={[
                    styles.dayCircle,
                    dayData?.isToday && styles.dayCircleToday,
                    isFuture && styles.dayCircleFuture,
                  ]}>
                    {dayData?.completed ? (
                      <FireIcon size={20} color={theme.colors.primary} />
                    ) : (
                      <Text style={[styles.dayDateText, dayData?.isToday && styles.dayDateTextToday]}>
                        {dateNum ?? ''}
                      </Text>
                    )}
                  </View>
                  {isPast && !dayData?.completed && (
                    <View style={styles.dayLock}>
                      <LockClosedIcon size={14} color={theme.colors.primary} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Progress today</Text>
        <Text style={styles.progressPercentage}>{progress}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Daily Rituals */}
      <View style={styles.ritualsContainer}>
        {dailyRituals.map((ritual) => {
          const isExpanded = expandedRitual === ritual.id;
          const animValue = animationValues[ritual.id as keyof typeof animationValues];
          
          const cardHeight = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [80, 220],
          });
          
          const contentOpacity = animValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          });
          
          const arrowRotation = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          });
          
          return (
            <TouchableOpacity
              key={ritual.id}
              style={[
                styles.ritualCard,
                ritual.completed && styles.ritualCardCompleted,
              ]}
              onPress={() => toggleExpanded(ritual.id)}
              activeOpacity={0.9}
            >
              <Animated.View style={{ height: cardHeight }}>
                {ritual.id === 'passage' && PASSAGE_BG_IMAGE ? (
                  <ImageBackground
                    source={PASSAGE_BG_IMAGE}
                    style={[styles.ritualGradient, { paddingVertical: 0, paddingLeft: 0, paddingRight: 0 }]}
                    imageStyle={styles.ritualImageBackground}
                    onLoadStart={() => {
                      imageLoadStartMsRef.current.passage = Date.now();
                    }}
                    onLoad={() => {
                      if (imageLoggedRef.current.passage) return;
                      const startMs = imageLoadStartMsRef.current.passage;
                      const elapsedMs = startMs ? Date.now() - startMs : -1;
                      console.log('[Today] Passage background loaded', { elapsedMs });
                      imageLoggedRef.current.passage = true;
                      forceImageRender((v) => v + 1);
                    }}
                  >
                    <View style={styles.ritualImageOverlay}>
                      <View style={styles.ritualHeader}>
                        <View style={styles.ritualLeft}>
                          {ritual.completed ? (
                            <View style={styles.checkmarkContainer}>
                              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View style={styles.ritualIconContainer}>{ritualIconMap[ritual.icon]}</View>
                          )}
                          <View style={styles.ritualInfo}>
                            <Text style={styles.ritualTitle}>{ritual.title}</Text>
                            <Text style={styles.ritualDuration}>• {ritual.duration}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.ritualAction}
                          onPress={() => toggleExpanded(ritual.id)}
                        >
                          <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                            <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
                          </Animated.View>
                        </TouchableOpacity>
                      </View>
                      {isExpanded && (
                        <Animated.View style={[styles.ritualPromptContainer, { opacity: contentOpacity }]}>
                          <Text style={styles.ritualPromptText}>{ritual.prompt}</Text>
                          <TouchableOpacity
                            style={styles.ritualStartButton}
                            onPress={(e) => { e?.stopPropagation?.(); ritual.onPress(); }}
                          >
                            <ArrowUpRightIcon size={24} color="#000000" />
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </View>
                  </ImageBackground>
                ) : ritual.mesh ? (
                  <View style={{ flex: 1 }}>
                    <AnimatedMeshGradient
                      width={CARD_WIDTH}
                      height={EXPANDED_CARD_HEIGHT}
                      borderRadius={theme.borderRadius.lg}
                      baseColors={ritual.mesh.baseColors}
                      blobColors={ritual.mesh.blobColors}
                      duration={ritual.id === 'checkin' ? 10000 : 12000}
                    />
                    <View style={[styles.ritualGradient, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                      <View style={styles.ritualHeader}>
                        <View style={styles.ritualLeft}>
                          {ritual.completed ? (
                            <View style={styles.checkmarkContainer}>
                              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View style={styles.ritualIconContainer}>{ritualIconMap[ritual.icon]}</View>
                          )}
                          <View style={styles.ritualInfo}>
                            <Text style={styles.ritualTitle}>{ritual.title}</Text>
                            <Text style={styles.ritualDuration}>• {ritual.duration}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.ritualAction}
                          onPress={() => toggleExpanded(ritual.id)}
                        >
                          <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                            <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
                          </Animated.View>
                        </TouchableOpacity>
                      </View>
                      {isExpanded && (
                        <Animated.View style={[styles.ritualPromptContainer, { opacity: contentOpacity }]}>
                          <Text style={styles.ritualPromptText}>{ritual.prompt}</Text>
                          <TouchableOpacity
                            style={styles.ritualStartButton}
                            onPress={(e) => { e?.stopPropagation?.(); ritual.onPress(); }}
                          >
                            <ArrowUpRightIcon size={24} color="#000000" />
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                ) : (
                  <LinearGradient
                    colors={ritual.colors as [string, string, ...string[]]}
                    style={styles.ritualGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.ritualHeader}>
                      <View style={styles.ritualLeft}>
                        {ritual.completed ? (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={styles.ritualIconContainer}>{ritualIconMap[ritual.icon]}</View>
                        )}
                        <View style={styles.ritualInfo}>
                          <Text style={styles.ritualTitle}>{ritual.title}</Text>
                          <Text style={styles.ritualDuration}>• {ritual.duration}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.ritualAction}
                        onPress={() => toggleExpanded(ritual.id)}
                      >
                        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                    {isExpanded && (
                      <Animated.View style={[styles.ritualPromptContainer, { opacity: contentOpacity }]}>
                        <Text style={styles.ritualPromptText}>{ritual.prompt}</Text>
                        <TouchableOpacity
                          style={styles.ritualStartButton}
                          onPress={(e) => { e?.stopPropagation?.(); ritual.onPress(); }}
                        >
                          <ArrowUpRightIcon size={24} color="#000000" />
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </LinearGradient>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quote of the Day */}
      <View style={styles.quoteCard}>
        {WISDOM_BG_IMAGE && (
          <Image
            source={WISDOM_BG_IMAGE}
            style={styles.quoteBackgroundImage}
            onLoadStart={() => {
              imageLoadStartMsRef.current.wisdom = Date.now();
            }}
            onLoad={() => {
              if (imageLoggedRef.current.wisdom) return;
              const startMs = imageLoadStartMsRef.current.wisdom;
              const elapsedMs = startMs ? Date.now() - startMs : -1;
              console.log('[Today] Wisdom background loaded', { elapsedMs });
              imageLoggedRef.current.wisdom = true;
              forceImageRender((v) => v + 1);
            }}
          />
        )}
        <View style={styles.quoteOverlay}>
          <Text style={styles.quoteLabel}>Wisdom of the Day</Text>
          <Text style={styles.quoteText}>
            "{dailyQuote?.quote_text || 'Waste no more time arguing about what a good man should be. Be one.'}"
          </Text>
          <Text style={styles.quoteAuthor}>— {dailyQuote?.author || 'Marcus Aurelius, Meditations'}</Text>
        </View>
      </View>
    </ScrollView>
    <ProfileDrawer
      visible={showProfileDrawer}
      onClose={() => setShowProfileDrawer(false)}
    />
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
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarButton: {
    width: 90,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  streakNumber: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  buttonDivider: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginHorizontal: 2,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  streakContainer: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: theme.colors.quaternary,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  streakStat: {
    flex: 1,
    alignItems: 'center',
  },
  streakStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakStatSeparator: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  streakIcon: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  streakLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  dayLabelToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dayCircleWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  dayCircleFuture: {
    opacity: 0.4,
  },
  dayDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  dayDateTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dayLock: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 4,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  ritualsContainer: {
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  ritualCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  ritualCardCompleted: {
    opacity: 1,
  },
  ritualGradient: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  ritualImageBackground: {
    borderRadius: theme.borderRadius.lg,
    top: -40,
    bottom: 0,
    height: undefined,
  },
  ritualImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  ritualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ritualLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  ritualIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualInfo: {
    flex: 1,
  },
  ritualTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ritualDuration: {
    fontSize: theme.typography.sizes.xs,
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ritualAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualPromptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: 8,
  },
  ritualPromptText: {
    flex: 1,
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  ritualStartButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    minHeight: 150,
    overflow: 'hidden',
  },
  quoteBackgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: -60,
    resizeMode: 'cover',
  },
  quoteOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: theme.spacing.lg,
    minHeight: 150,
    justifyContent: 'center',
  },
  quoteLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteText: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteAuthor: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
