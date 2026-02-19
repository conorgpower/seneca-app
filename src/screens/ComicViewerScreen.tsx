import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import type { MainStackParamList } from '../navigation/MainNavigator';
import {
  ComicId,
  ComicPageSource,
  COMICS_DATA,
  getComicImagePaths,
  getComicPageSources,
  isComicId,
} from '../data/comics';
import {
  getImageCacheStatusForPath,
  prefetchImagePathWithMetrics,
  warmImageCacheForPaths,
} from '../services/image-cache.service';

const { width } = Dimensions.get('window');
type ComicViewerRouteProp = RouteProp<MainStackParamList, 'ComicViewer'>;
type ComicViewerNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ComicViewer'>;

export default function ComicViewerScreen() {
  const navigation = useNavigation<ComicViewerNavigationProp>();
  const route = useRoute<ComicViewerRouteProp>();
  const { comicId } = route.params;
  const [currentPage, setCurrentPage] = useState(0);
  const listRef = useRef<FlatList<ComicPageSource>>(null);
  const [failedPrimaryPages, setFailedPrimaryPages] = useState<Record<number, boolean>>({});
  const [, forcePageRender] = useState(0);
  const pageLoadStartMsRef = useRef<Record<number, number>>({});
  const pagePathByIndexRef = useRef<Record<number, string>>({});
  const pagePrefetchMetricsRef = useRef<
    Record<number, { statusBefore: string; statusAfter: string; prefetchMs: number }>
  >({});
  const pageCacheStatusAtLoadStartRef = useRef<Record<number, string>>({});
  const loggedPageLoadedRef = useRef<Record<number, boolean>>({});

  const resolvedComicId: ComicId = isComicId(comicId) ? comicId : 'gadfly_of_athens';
  const comic = COMICS_DATA[resolvedComicId];
  const comicPages = getComicPageSources(resolvedComicId);
  const comicPaths = useMemo(() => getComicImagePaths(resolvedComicId), [resolvedComicId]);
  const totalPages = comicPages.length;
  const data = comicPages;

  useEffect(() => {
    setCurrentPage(0);
    setFailedPrimaryPages({});
    pagePathByIndexRef.current = {};
    pagePrefetchMetricsRef.current = {};
    pageCacheStatusAtLoadStartRef.current = {};
    pageLoadStartMsRef.current = {};
    loggedPageLoadedRef.current = {};
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [resolvedComicId]);

  useEffect(() => {
    const nextIndices = [currentPage + 1].filter((index) => index < data.length);
    nextIndices.forEach((index) => {
      const path = comicPaths[index];
      if (!path) return;
      prefetchImagePathWithMetrics(path)
        .then((metrics) => {
          pagePrefetchMetricsRef.current[index] = metrics;
          console.log('[Comics][Cache] Prefetch', {
            comicId: resolvedComicId,
            pageIndex: index,
            statusBefore: metrics.statusBefore,
            statusAfter: metrics.statusAfter,
            prefetchMs: metrics.prefetchMs,
          });
        })
        .catch(() => undefined);
    });
  }, [comicPaths, currentPage, data.length, resolvedComicId]);

  useEffect(() => {
    warmImageCacheForPaths(comicPaths).catch(() => undefined);
  }, [comicPaths]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(contentOffsetX / width);
    setCurrentPage(page);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(_, index) => `${resolvedComicId}-${index}`}
          renderItem={({ item: pageSource, index }) => {
            const comicPath = comicPaths[index];
            if (comicPath) pagePathByIndexRef.current[index] = comicPath;
            const activeSource = failedPrimaryPages[index] ? pageSource.fallback : pageSource.primary;

            return (
              <View style={styles.pageContainer}>
                {activeSource ? (
                  <Image
                    source={activeSource}
                    style={styles.comicImage}
                    resizeMode="contain"
                    fadeDuration={0}
                    resizeMethod="resize"
                    onLoadStart={() => {
                      pageLoadStartMsRef.current[index] = Date.now();
                      const path = pagePathByIndexRef.current[index];
                      if (!path) return;
                      getImageCacheStatusForPath(path)
                        .then((status) => {
                          pageCacheStatusAtLoadStartRef.current[index] = status;
                          console.log('[Comics][Cache] Load start', {
                            comicId: resolvedComicId,
                            pageIndex: index,
                            cacheStatus: status,
                          });
                        })
                        .catch(() => undefined);
                    }}
                    onLoad={() => {
                      if (loggedPageLoadedRef.current[index]) return;
                      const startMs = pageLoadStartMsRef.current[index];
                      const elapsedMs = startMs ? Date.now() - startMs : -1;
                      const prefetchMetrics = pagePrefetchMetricsRef.current[index];
                      const cacheStatusAtLoadStart = pageCacheStatusAtLoadStartRef.current[index] || 'unknown';
                      console.log('[Comics] Page loaded', {
                        comicId: resolvedComicId,
                        pageIndex: index,
                        elapsedMs,
                        mountMs: elapsedMs,
                        cacheStatusAtLoadStart,
                        prefetchStatusBefore: prefetchMetrics?.statusBefore ?? 'n/a',
                        prefetchStatusAfter: prefetchMetrics?.statusAfter ?? 'n/a',
                        prefetchMs: prefetchMetrics?.prefetchMs ?? -1,
                        usingFallback: failedPrimaryPages[index] === true,
                      });
                      loggedPageLoadedRef.current[index] = true;
                      forcePageRender((v) => v + 1);
                    }}
                    onError={(event) => {
                      const primaryFailed = failedPrimaryPages[index] === true;
                      if (!primaryFailed && pageSource.fallback) {
                        console.warn('[Comics] Page primary failed, switching to fallback', {
                          comicId: resolvedComicId,
                          pageIndex: index,
                          primaryUrl: (pageSource.primary as { uri?: string } | null)?.uri,
                          fallbackUrl: (pageSource.fallback as { uri?: string } | null)?.uri,
                          nativeError: event.nativeEvent?.error,
                        });
                        setFailedPrimaryPages((prev) => ({ ...prev, [index]: true }));
                        return;
                      }
                      console.warn('[Comics] Page fallback failed', {
                        comicId: resolvedComicId,
                        pageIndex: index,
                        fallbackUrl: (pageSource.fallback as { uri?: string } | null)?.uri,
                        nativeError: event.nativeEvent?.error,
                      });
                    }}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <View style={styles.placeholderContent}>
                      <Text style={styles.placeholderIcon}>🎨</Text>
                      <Text style={styles.placeholderText}>
                        {comic.title}
                      </Text>
                      <Text style={styles.placeholderPage}>
                        Page {index + 1}
                      </Text>
                      <Text style={styles.placeholderSubtext}>
                        Image coming soon
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={styles.scrollView}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={2}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              (currentPage === 0 || totalPages === 0) && styles.navButtonDisabled,
            ]}
            onPress={() => {
              if (currentPage > 0) {
                listRef.current?.scrollToIndex({
                  index: currentPage - 1,
                  animated: true,
                });
              }
            }}
            disabled={currentPage === 0 || totalPages === 0}
          >
            <Text
              style={[
                styles.navButtonText,
                currentPage === 0 && styles.navButtonTextDisabled,
              ]}
            >
              ← Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              (currentPage === totalPages - 1 || totalPages === 0) && styles.navButtonDisabled,
            ]}
            onPress={() => {
              if (currentPage < totalPages - 1) {
                listRef.current?.scrollToIndex({
                  index: currentPage + 1,
                  animated: true,
                });
              }
            }}
            disabled={currentPage === totalPages - 1 || totalPages === 0}
          >
            <Text
              style={[
                styles.navButtonText,
                currentPage === totalPages - 1 && styles.navButtonTextDisabled,
              ]}
            >
              Next →
            </Text>
          </TouchableOpacity>
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
  closeButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 20,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  comicImage: {
    flex: 1,
    width: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  imagePlaceholder: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  placeholderText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  placeholderPage: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  placeholderSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  navigationContainer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  navButton: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
});
