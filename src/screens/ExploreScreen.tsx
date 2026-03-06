import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { drawerEvent } from '../utils/drawerEvent';
import { BOOKS, getRandomViewerCount } from '../data/works-metadata';
import { ComicId, COMICS, getComicCoverSources, getComicImagePaths } from '../data/comics';
import { LESSONS, formatDuration } from '../data/audio-lessons';
import { BREATHWORK_EXERCISES, BreathworkIconName } from '../data/breathwork-exercises';
import {
  Square2StackIcon,
  MoonIcon,
  BoltIcon,
  HeartIcon,
  FireIcon,
  MusicalNoteIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  BookOpenIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  PaintBrushIcon,
  EyeIcon,
  HandRaisedIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  TrophyIcon,
} from 'react-native-heroicons/solid';
import { ExploreStackParamList } from '../navigation/ExploreNavigator';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { warmImageCacheForPath, warmImageCacheForPaths } from '../services/image-cache.service';
import { AppBackground } from '../components/AppBackground';

const { width } = Dimensions.get('window');

type ExploreNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ExploreStackParamList, 'ExploreMain'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const STOIC_QUOTES = [
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'It is not what happens to you, but how you react to it that matters.', author: 'Epictetus' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'The best revenge is not to be like your enemy.', author: 'Marcus Aurelius' },
  { text: 'He who fears death will never do anything worthy of a living man.', author: 'Seneca' },
];

function getDailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return STOIC_QUOTES[dayOfYear % STOIC_QUOTES.length];
}

const PHILOSOPHERS = [
  {
    id: 'marcus',
    name: 'Marcus Aurelius',
    title: 'Stoic Emperor',
    emoji: '👑',
    works: ['Meditations'],
  },
  {
    id: 'seneca',
    name: 'Seneca',
    title: 'Roman Philosopher',
    emoji: '📜',
    works: ['Letters to Lucilius', 'On the Shortness of Life'],
  },
  {
    id: 'epictetus',
    name: 'Epictetus',
    title: 'Stoic Teacher',
    emoji: '⚡',
    works: ['Enchiridion', 'Discourses'],
  },
  {
    id: 'nietzsche',
    name: 'Friedrich Nietzsche',
    title: 'Existentialist',
    emoji: '⚔️',
    works: ['Thus Spake Zarathustra', 'Beyond Good and Evil'],
  },
];

const TABS: { id: string; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'lesson', label: 'Listen', Icon: SpeakerWaveIcon },
  { id: 'breathe', label: 'Breathe', Icon: SparklesIcon },
  { id: 'comics', label: 'Comics', Icon: ChatBubbleBottomCenterTextIcon },
  { id: 'read', label: 'Read', Icon: BookOpenIcon },
  { id: 'watch', label: 'Watch', Icon: VideoCameraIcon },
  { id: 'study', label: 'Study', Icon: AcademicCapIcon },
  { id: 'kids', label: 'Kids', Icon: PaintBrushIcon },
];

const LESSON_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  amor_fati: HeartIcon,
  the_borrowed_cup: HandRaisedIcon,
  memento_mori: ClockIcon,
  obstacle_becomes_way: ArrowTrendingUpIcon,
  arrow_and_target: EyeIcon,
  two_handles: ScaleIcon,
};

const BREATHWORK_ICONS: Record<BreathworkIconName, React.ComponentType<{ size?: number; color?: string }>> = {
  Square2StackIcon,
  MoonIcon,
  BoltIcon,
  HeartIcon,
  FireIcon,
  MusicalNoteIcon,
};

export default function ExploreScreen() {
  const navigation = useNavigation<ExploreNavigationProp>();
  const { user } = useAuth();
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('lesson');
  const [failedPrimaryCovers, setFailedPrimaryCovers] = useState<Record<string, boolean>>({});
  const [, forceCoverRender] = useState(0);
  const coverLoadStartMsRef = React.useRef<Record<string, number>>({});
  const loggedCoverLoadedRef = React.useRef<Record<string, boolean>>({});
  const warmedComicPagesRef = React.useRef<Record<string, boolean>>({});
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

  const handleBookPress = (bookId: string, title: string, author: string) => {
    navigation.navigate('BookReader', { workId: `${author}:${title}` });
  };

  const handleComicPress = async (comicId: ComicId) => {
    const paths = getComicImagePaths(comicId);
    const firstPagePath = paths[0];
    const remainingPaths = paths.slice(1);

    if (firstPagePath) {
      await Promise.race([
        warmImageCacheForPath(firstPagePath),
        new Promise<void>((resolve) => setTimeout(resolve, 220)),
      ]);
    }

    warmImageCacheForPaths(remainingPaths).catch(() => undefined);
    navigation.navigate('ComicViewer', { comicId });
  };

  const handleLessonPress = (lessonId: string) => {
    navigation.navigate('AudioLesson', { lessonId });
  };

  const handleBreathworkPress = (exerciseId: string) => {
    navigation.navigate('Breathwork', { exerciseId });
  };

  const renderHeaderAndTabs = () => (
    <>
      <View style={styles.headerContainer}>
        <ProfileAvatar
          name={userName}
          avatarUrl={user?.user_metadata?.avatar_url}
          onPress={() => setShowProfileDrawer(true)}
        />
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
        </View>
        <TouchableOpacity
          style={styles.trophyButton}
          onPress={() => navigation.navigate('AchievementsList')}
          activeOpacity={0.7}
        >
          <TrophyIcon size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
        decelerationRate="fast"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <tab.Icon
                size={16}
                color={isActive ? '#FFFFFF' : theme.colors.primary}
              />
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  const renderComicCard = ({ item: comic }: { item: (typeof COMICS)[number] }) => {
    const { primary, fallback } = getComicCoverSources(comic.id);
    const primaryFailed = failedPrimaryCovers[comic.id] === true;
    const coverImage = primaryFailed ? fallback : primary;

    return (
      <TouchableOpacity
        key={comic.id}
        style={styles.comicCoverCard}
        onPress={() => handleComicPress(comic.id)}
        activeOpacity={0.8}
      >
        {comic.hasCover && coverImage ? (
          <Image
            source={coverImage}
            style={styles.comicCoverImage}
            resizeMode="contain"
            fadeDuration={0}
            resizeMethod="resize"
            onLoadStart={() => {
              coverLoadStartMsRef.current[comic.id] = Date.now();
            }}
            onLoad={() => {
              if (loggedCoverLoadedRef.current[comic.id]) return;
              const startMs = coverLoadStartMsRef.current[comic.id];
              const elapsedMs = startMs ? Date.now() - startMs : -1;
              console.log('[Comics] Cover loaded', {
                comicId: comic.id,
                elapsedMs,
                usingFallback: primaryFailed,
              });
              if (!warmedComicPagesRef.current[comic.id]) {
                warmedComicPagesRef.current[comic.id] = true;
                warmImageCacheForPaths(getComicImagePaths(comic.id).slice(1)).catch(() => undefined);
              }
              loggedCoverLoadedRef.current[comic.id] = true;
              forceCoverRender((v) => v + 1);
            }}
            onError={(event) => {
              if (!primaryFailed && fallback) {
                console.warn('[Comics] Cover primary failed, switching to fallback', {
                  comicId: comic.id,
                  primaryUrl: (primary as { uri?: string } | null)?.uri,
                  fallbackUrl: (fallback as { uri?: string } | null)?.uri,
                  nativeError: event.nativeEvent?.error,
                });
                setFailedPrimaryCovers((prev) => ({ ...prev, [comic.id]: true }));
                return;
              }
              console.warn('[Comics] Cover fallback failed', {
                comicId: comic.id,
                fallbackUrl: (fallback as { uri?: string } | null)?.uri,
                nativeError: event.nativeEvent?.error,
              });
            }}
          />
        ) : (
          <View style={styles.comicCoverPlaceholder}>
            <Text style={styles.comicCoverEmoji}>{comic.emoji}</Text>
            <Text style={styles.comicCoverComingSoon}>Coming Soon</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (activeTab === 'comics') {
    return (
      <AppBackground topSafeZone={180}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.comicsTopChrome}>
            {renderHeaderAndTabs()}
          </View>
          <FlatList
            data={COMICS}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={renderComicCard}
            contentContainerStyle={styles.comicsListContent}
            columnWrapperStyle={styles.comicsListRow}
            showsVerticalScrollIndicator={false}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            ListHeaderComponent={
              <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
                <Text style={styles.sectionTitle}>Philosophical Comics</Text>
              </View>
            }
          />
        </View>
        <ProfileDrawer
          visible={showProfileDrawer}
          onClose={() => setShowProfileDrawer(false)}
        />
      </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground topSafeZone={180}>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {renderHeaderAndTabs()}

      {/* Read Tab Content */}
      {activeTab === 'read' && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Essential Readings</Text>
        </View>

        <View style={styles.readingsContainer}>
          {BOOKS.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={styles.readingCard}
              onPress={() => handleBookPress(book.id, book.title, book.author)}
            >
              <View style={styles.readingLeft}>
                <View style={styles.readingIconWrap}>
                  <BookOpenIcon size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.readingInfo}>
                  <Text style={styles.readingTitle}>{book.title}</Text>
                  <Text style={styles.readingAuthor}>{book.author}</Text>
                </View>
              </View>
              <View style={styles.readingViewers}>
                <EyeIcon size={14} color={theme.colors.textSecondary} />
                <Text style={styles.readingViewersText}>
                  {getRandomViewerCount()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      )}

      {/* Listen Tab Content */}
      {activeTab === 'lesson' && (
        <View style={styles.section}>
          {/* Daily Stoic Quote Banner */}
          <View style={styles.quoteBanner}>
            <View style={styles.quoteLine} />
            <Text style={styles.quoteText}>"{getDailyQuote().text}"</Text>
            <Text style={styles.quoteAuthor}>— {getDailyQuote().author}</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Audio Lessons</Text>
          </View>

          <View style={styles.lessonsContainer}>
            {LESSONS.map((lesson) => {
              const LessonIcon = LESSON_ICONS[lesson.id] || SpeakerWaveIcon;
              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => handleLessonPress(lesson.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.lessonIconWrap}>
                    <LessonIcon size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDescription}>{lesson.description}</Text>
                    <Text style={styles.lessonDuration}>{formatDuration(lesson.durationSeconds)}</Text>
                  </View>
                  <View style={styles.lessonPlayButton}>
                    <Text style={styles.lessonPlayButtonText}>▶</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Breathe Tab Content */}
      {activeTab === 'breathe' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Breathing Exercises</Text>
          </View>
          <View style={styles.lessonsContainer}>
            {BREATHWORK_EXERCISES.map((exercise) => {
              const IconComponent = BREATHWORK_ICONS[exercise.icon];
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.lessonCard}
                  onPress={() => handleBreathworkPress(exercise.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.breathworkIconWrap}>
                    <IconComponent size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{exercise.title}</Text>
                    <Text style={styles.lessonDescription}>
                      {exercise.description}
                    </Text>
                    <Text style={styles.breathworkMeta}>
                      {exercise.purpose}  ·  {exercise.durationMinutes} min
                    </Text>
                  </View>
                  <View style={styles.lessonPlayButton}>
                    <Text style={styles.lessonPlayButtonText}>▶</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Coming Soon Tabs */}
      {(activeTab === 'kids' || activeTab === 'watch' || activeTab === 'study') && (
        <View style={styles.comingSoonContainer}>
          <View style={styles.comingSoonContent}>
            <View style={styles.comingSoonIconWrap}>
              {activeTab === 'kids' ? (
                <PaintBrushIcon size={40} color={theme.colors.primary} />
              ) : activeTab === 'watch' ? (
                <VideoCameraIcon size={40} color={theme.colors.primary} />
              ) : (
                <AcademicCapIcon size={40} color={theme.colors.primary} />
              )}
            </View>
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonDescription}>
              {activeTab === 'kids'
                ? "We're crafting engaging philosophical content for young minds. Stay tuned!"
                : activeTab === 'watch'
                ? "Video content exploring philosophical ideas is in production. Stay tuned!"
                : "In-depth study guides and courses are being developed. Stay tuned!"}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
    <ProfileDrawer
      visible={showProfileDrawer}
      onClose={() => setShowProfileDrawer(false)}
    />
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
  content: {
    paddingBottom: theme.spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  header: {
    flex: 1,
    alignItems: 'center',
  },
  trophyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tabsContainer: {
    flexGrow: 0,
    marginBottom: theme.spacing.lg,
  },
  tabsContent: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full || 20,
    backgroundColor: theme.colors.backgroundCard,
    marginRight: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAll: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  featuredCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredContent: {
    flex: 1,
  },
  featuredBadge: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 28,
  },
  featuredDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  featuredArrow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  featuredArrowText: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  philosophersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  philosopherCard: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  philosopherEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  philosopherEmojiText: {
    fontSize: 32,
  },
  philosopherName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  philosopherTitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  readingsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  readingCard: {
    backgroundColor: 'rgba(242, 223, 192, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 173, 92, 0.2)',
  },
  readingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  readingInfo: {
    flex: 1,
  },
  readingTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  readingAuthor: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  readingViewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  readingViewersText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  quoteBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(222, 173, 92, 0.08)',
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  quoteLine: {
    display: 'none',
  },
  quoteText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryLight,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: theme.spacing.sm,
  },
  quoteAuthor: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  lessonIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  lessonDuration: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  lessonsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  lessonCard: {
    backgroundColor: 'rgba(242, 223, 192, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(222, 173, 92, 0.2)',
  },
  lessonCardActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  lessonInfo: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  lessonTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  lessonDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  breathworkIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  breathworkMeta: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  lessonPlayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonPlayButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  lessonPlayButtonText: {
    fontSize: 20,
    color: theme.colors.text,
    marginLeft: 2,
  },
  comingSoonContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl * 2,
    alignItems: 'center',
  },
  comingSoonContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  comingSoonIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  comingSoonTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  comingSoonDescription: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  comicsGrid: {
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  comicsListContent: {
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  comicsTopChrome: {
    backgroundColor: theme.colors.background,
    zIndex: 10,
    elevation: 10,
  },
  comicsListRow: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  comicCoverCard: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    aspectRatio: 2 / 3,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundCard,
  },
  comicCoverImage: {
    width: '100%',
    height: '100%',
  },
  comicCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comicCoverEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  comicCoverComingSoon: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
