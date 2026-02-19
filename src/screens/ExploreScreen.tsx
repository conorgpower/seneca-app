import React, { useState, useEffect } from 'react';
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
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { drawerEvent } from '../utils/drawerEvent';
import { BOOKS, getRandomViewerCount } from '../data/works-metadata';
import { ComicId, COMICS, getComicCoverSources, getComicImagePaths } from '../data/comics';
import { LESSONS } from '../data/audio-lessons';
import { ExploreStackParamList } from '../navigation/ExploreNavigator';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { warmImageCacheForPath, warmImageCacheForPaths } from '../services/image-cache.service';

const { width } = Dimensions.get('window');

type ExploreNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ExploreStackParamList, 'ExploreMain'>,
  NativeStackNavigationProp<MainStackParamList>
>;

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

const TABS = [
  { id: 'lesson', label: 'Listen', emoji: '🎧' },
  { id: 'comics', label: 'Comics', emoji: '💭' },
  { id: 'read', label: 'Read', emoji: '📖' },
  { id: 'watch', label: 'Watch', emoji: '📺' },
  { id: 'study', label: 'Study', emoji: '📚' },
  { id: 'kids', label: 'Kids', emoji: '🎨' },
];

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
  useEffect(() => {
    return drawerEvent.listen(() => setShowProfileDrawer(true));
  }, []);

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

  const renderHeaderAndTabs = () => (
    <>
      <View style={styles.headerContainer}>
        <ProfileAvatar
          name={userName}
          onPress={() => setShowProfileDrawer(true)}
        />
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
        decelerationRate="fast"
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
      <SafeAreaView style={styles.safeArea}>
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
              <View style={styles.sectionHeader}>
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
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
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
                <Text style={styles.readingEmoji}>{book.emoji}</Text>
                <View style={styles.readingInfo}>
                  <Text style={styles.readingTitle}>{book.title}</Text>
                  <Text style={styles.readingAuthor}>{book.author}</Text>
                </View>
              </View>
              <View style={styles.readingViewers}>
                <Text style={styles.readingViewersIcon}>👁️</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Audio Lessons</Text>
          </View>

          <View style={styles.lessonsContainer}>
            {LESSONS.map((lesson) => {
              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => handleLessonPress(lesson.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDescription}>{lesson.description}</Text>
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
            <Text style={styles.comingSoonEmoji}>
              {activeTab === 'kids' ? '🎨' : activeTab === 'watch' ? '📺' : '📚'}
            </Text>
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
  headerSpacer: {
    width: 60,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
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
  tabEmoji: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
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
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readingEmoji: {
    fontSize: 32,
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  readingViewersIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  readingViewersText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  lessonsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  lessonCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  comingSoonEmoji: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
    opacity: 0.9,
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
