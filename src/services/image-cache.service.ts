import { Image } from 'react-native';
import { getSupabaseImageUrl } from '../data/asset-cdn';
import { getAllComicImagePaths } from '../data/comics';

const warmedUris = new Set<string>();
const pendingUriPrefetches = new Map<string, Promise<void>>();
let globalWarmupPromise: Promise<void> | null = null;

const BACKGROUND_IMAGE_PATHS = [
  'images/passage-of-day.webp',
  'images/background-quote.webp',
  'images/background-quote-2.webp',
  'images/background-live-reflection.webp',
];

const TODAY_SCREEN_IMAGE_PATHS = [
  'images/passage-of-day.webp',
  'images/background-quote-2.webp',
];

const CHAT_SCREEN_IMAGE_PATHS = ['images/background-quote.webp'];

const ONBOARDING_FLOW_IMAGE_PATHS = [
  'images/comic/seneca.webp',
  'images/logos/apple-white.webp',
  'images/logos/google.webp',
  'images/logos/seneca-logo.webp',
  'images/social-proof/user1.webp',
  'images/social-proof/user2.webp',
  'images/social-proof/user3.webp',
  'images/social-proof/user4.webp',
  'images/social-proof/user5.webp',
  'images/social-proof/user6.webp',
];

type CacheStatus = 'memory' | 'disk' | 'disk/memory' | 'miss' | 'unavailable';

export async function getImageCacheStatusForPath(path: string): Promise<CacheStatus> {
  const uri = getSupabaseImageUrl(path);
  if (!uri) return 'unavailable';
  if (typeof Image.queryCache !== 'function') return 'unavailable';

  try {
    const result = await Image.queryCache([uri]);
    return (result[uri] as 'memory' | 'disk' | 'disk/memory' | undefined) ?? 'miss';
  } catch {
    return 'unavailable';
  }
}

export async function prefetchImagePathWithMetrics(path: string): Promise<{
  statusBefore: CacheStatus;
  statusAfter: CacheStatus;
  prefetchMs: number;
}> {
  const uri = getSupabaseImageUrl(path);
  if (!uri) {
    return {
      statusBefore: 'unavailable',
      statusAfter: 'unavailable',
      prefetchMs: -1,
    };
  }

  const statusBefore = await getImageCacheStatusForPath(path);
  const startedAt = Date.now();
  await prefetchUri(uri);
  const prefetchMs = Date.now() - startedAt;
  const statusAfter = await getImageCacheStatusForPath(path);

  return { statusBefore, statusAfter, prefetchMs };
}

async function prefetchUri(uri: string): Promise<void> {
  if (warmedUris.has(uri)) return;
  const pending = pendingUriPrefetches.get(uri);
  if (pending) return pending;

  const prefetchPromise = (async () => {
    try {
      await Image.prefetch(uri);
      warmedUris.add(uri);
    } catch {
      // Best-effort warmup; failures can retry later.
    } finally {
      pendingUriPrefetches.delete(uri);
    }
  })();

  pendingUriPrefetches.set(uri, prefetchPromise);

  try {
    await prefetchPromise;
  } catch {
    // Swallow and keep warmup best-effort.
  }
}

async function runWithConcurrency(items: string[], concurrency: number): Promise<void> {
  if (items.length === 0) return;

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await prefetchUri(current);
    }
  });

  await Promise.all(workers);
}

export function warmImageCacheForPath(path: string): Promise<void> {
  const uri = getSupabaseImageUrl(path);
  if (!uri) return Promise.resolve();
  return prefetchUri(uri);
}

export async function warmImageCacheForPaths(paths: string[], concurrency = 3): Promise<void> {
  const uris = paths
    .map((path) => getSupabaseImageUrl(path))
    .filter((uri): uri is string => Boolean(uri));

  if (uris.length === 0) return;
  await runWithConcurrency(Array.from(new Set(uris)), concurrency);
}

export function warmGlobalImageCache(): Promise<void> {
  if (globalWarmupPromise) return globalWarmupPromise;

  const uris = [...BACKGROUND_IMAGE_PATHS, ...getAllComicImagePaths()]
    .map((path) => getSupabaseImageUrl(path))
    .filter((uri): uri is string => Boolean(uri));

  globalWarmupPromise = runWithConcurrency(Array.from(new Set(uris)), 3);
  return globalWarmupPromise;
}

export function getOnboardingWarmupImagePaths(): string[] {
  // Warm onboarding assets first so the auth/onboarding flow stays fast.
  // After that, warm broader app assets opportunistically.
  return Array.from(
    new Set([
      ...ONBOARDING_FLOW_IMAGE_PATHS,
      ...BACKGROUND_IMAGE_PATHS,
      ...getAllComicImagePaths(),
    ])
  );
}

type GentleWarmupOptions = {
  delayMs?: number;
};

export function startGentleImageWarmup(
  paths: string[] = getOnboardingWarmupImagePaths(),
  options: GentleWarmupOptions = {}
): { stop: () => void } {
  const delayMs = Math.max(0, options.delayMs ?? 250);
  let stopped = false;
  const startedAt = Date.now();

  if (__DEV__) {
    console.log('[Warmup] Gentle image warmup started', {
      totalPaths: paths.length,
      delayMs,
    });
  }

  const run = async () => {
    for (let index = 0; index < paths.length; index += 1) {
      const imagePath = paths[index];
      if (stopped) break;
      const metrics = await prefetchImagePathWithMetrics(imagePath).catch(() => ({
        statusBefore: 'unavailable' as CacheStatus,
        statusAfter: 'unavailable' as CacheStatus,
        prefetchMs: -1,
      }));

      if (__DEV__) {
        console.log('[Warmup] Prefetched image', {
          index: index + 1,
          total: paths.length,
          imagePath,
          statusBefore: metrics.statusBefore,
          statusAfter: metrics.statusAfter,
          prefetchMs: metrics.prefetchMs,
        });
      }

      if (stopped || delayMs === 0) continue;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (__DEV__) {
      console.log('[Warmup] Gentle image warmup completed', {
        totalPaths: paths.length,
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  run().catch(() => undefined);

  return {
    stop: () => {
      stopped = true;
      if (__DEV__) {
        console.log('[Warmup] Gentle image warmup stopped', {
          elapsedMs: Date.now() - startedAt,
        });
      }
    },
  };
}

type SignedInWarmupOptions = {
  delayMs?: number;
};

async function prefetchPathIfNeeded(path: string): Promise<{
  skipped: boolean;
  statusBefore: CacheStatus;
  statusAfter: CacheStatus;
  prefetchMs: number;
}> {
  const statusBefore = await getImageCacheStatusForPath(path);
  if (statusBefore === 'memory' || statusBefore === 'disk' || statusBefore === 'disk/memory') {
    return {
      skipped: true,
      statusBefore,
      statusAfter: statusBefore,
      prefetchMs: 0,
    };
  }

  const result = await prefetchImagePathWithMetrics(path);
  return {
    skipped: false,
    ...result,
  };
}

export function startSignedInPriorityWarmup(
  options: SignedInWarmupOptions = {}
): { stop: () => void } {
  const delayMs = Math.max(0, options.delayMs ?? 220);
  let stopped = false;
  const startedAt = Date.now();

  const phases: Array<{ name: 'today' | 'chat' | 'comics'; paths: string[] }> = [
    { name: 'today', paths: TODAY_SCREEN_IMAGE_PATHS },
    { name: 'chat', paths: CHAT_SCREEN_IMAGE_PATHS },
    { name: 'comics', paths: getAllComicImagePaths() },
  ];

  if (__DEV__) {
    console.log('[Warmup][SignedIn] Started', {
      delayMs,
      todayCount: TODAY_SCREEN_IMAGE_PATHS.length,
      chatCount: CHAT_SCREEN_IMAGE_PATHS.length,
      comicsCount: phases[2].paths.length,
    });
  }

  const run = async () => {
    for (const phase of phases) {
      if (stopped) break;

      if (__DEV__) {
        console.log('[Warmup][SignedIn] Phase start', {
          phase: phase.name,
          total: phase.paths.length,
        });
      }

      for (let index = 0; index < phase.paths.length; index += 1) {
        if (stopped) break;
        const imagePath = phase.paths[index];
        const metrics = await prefetchPathIfNeeded(imagePath).catch(() => ({
          skipped: false,
          statusBefore: 'unavailable' as CacheStatus,
          statusAfter: 'unavailable' as CacheStatus,
          prefetchMs: -1,
        }));

        if (__DEV__) {
          console.log('[Warmup][SignedIn] Image', {
            phase: phase.name,
            index: index + 1,
            total: phase.paths.length,
            imagePath,
            skipped: metrics.skipped,
            statusBefore: metrics.statusBefore,
            statusAfter: metrics.statusAfter,
            prefetchMs: metrics.prefetchMs,
          });
        }

        if (stopped || delayMs === 0) continue;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    if (__DEV__) {
      console.log('[Warmup][SignedIn] Completed', {
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  run().catch(() => undefined);

  return {
    stop: () => {
      stopped = true;
      if (__DEV__) {
        console.log('[Warmup][SignedIn] Stopped', {
          elapsedMs: Date.now() - startedAt,
        });
      }
    },
  };
}
