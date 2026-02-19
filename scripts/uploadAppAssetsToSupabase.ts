import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET = process.env.SUPABASE_OPTIMIZED_ASSET_BUCKET || 'app-assets-mobile';
const SOURCE_BUCKET = process.env.SUPABASE_ASSET_BUCKET || 'app-assets';
const execFileAsync = promisify(execFile);
let checkedCwebp = false;
let hasCwebp = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '../assets');

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );
  return nested.flat();
}

function isSupportedAsset(filePath: string): boolean {
  return /\.(png|jpg|jpeg|webp|mp3|m4a|wav)$/i.test(filePath);
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

function getContentTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

type OutputFormat = 'original' | 'jpeg' | 'webp';

type OptimizationProfile = {
  maxDim: number;
  quality: number;
  outputFormat: OutputFormat;
  minSizeBytes: number;
};

function getImageOptimizationProfile(relativePath: string): OptimizationProfile {
  // Comics are phone-only and currently the hottest slow path.
  if (relativePath.includes('images/comic/')) {
    return { maxDim: 960, quality: 68, outputFormat: 'webp', minSizeBytes: 40 * 1024 };
  }

  // Full-width card backgrounds shown on mobile.
  if (relativePath.includes('images/background-') || relativePath.includes('images/passage-of-day')) {
    return { maxDim: 1080, quality: 72, outputFormat: 'webp', minSizeBytes: 50 * 1024 };
  }

  // Small avatars in onboarding/social proof.
  if (relativePath.includes('images/social-proof/')) {
    return { maxDim: 280, quality: 74, outputFormat: 'webp', minSizeBytes: 25 * 1024 };
  }

  // Keep logos crisp while still converting to webp.
  if (relativePath.includes('images/logos/')) {
    return { maxDim: 320, quality: 82, outputFormat: 'webp', minSizeBytes: 20 * 1024 };
  }

  return { maxDim: 1080, quality: 72, outputFormat: 'webp', minSizeBytes: 50 * 1024 };
}

function getContentTypeForFormat(filePath: string, outputFormat: OutputFormat): string {
  if (outputFormat === 'jpeg') return 'image/jpeg';
  if (outputFormat === 'webp') return 'image/webp';
  return getContentType(filePath);
}

function getUploadPath(relativePath: string, contentType: string): string {
  if (contentType !== 'image/webp') return relativePath;

  const ext = path.extname(relativePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return relativePath;
  return relativePath.replace(/\.[^./]+$/, '.webp');
}

function getLegacyImagePaths(uploadPath: string): string[] {
  if (!uploadPath.includes('images/')) return [];
  if (!uploadPath.endsWith('.webp')) return [];

  const base = uploadPath.replace(/\.webp$/i, '');
  return [`${base}.png`, `${base}.jpg`, `${base}.jpeg`];
}

async function ensureCwebpAvailability(): Promise<boolean> {
  if (checkedCwebp) return hasCwebp;
  checkedCwebp = true;
  try {
    await execFileAsync('cwebp', ['-version']);
    hasCwebp = true;
  } catch {
    hasCwebp = false;
  }
  return hasCwebp;
}

async function optimizeImageForMobile(
  originalBytes: Buffer,
  ext: string,
  relativePath: string
): Promise<{ bytes: Buffer; contentType: string }> {
  const canOptimizeWithSips =
    process.platform === 'darwin' && (ext === '.png' || ext === '.jpg' || ext === '.jpeg');
  const originalContentType = getContentTypeFromExt(ext);

  if (!canOptimizeWithSips) {
    return { bytes: originalBytes, contentType: originalContentType };
  }

  const profile = getImageOptimizationProfile(relativePath);
  const outputFormat = profile.outputFormat;

  // Skip tiny files where optimization overhead is unlikely to pay off.
  if (outputFormat !== 'webp' && originalBytes.length < profile.minSizeBytes) {
    return { bytes: originalBytes, contentType: originalContentType };
  }

  const outputExt = outputFormat === 'jpeg' ? '.jpg' : outputFormat === 'webp' ? '.webp' : ext;
  const tmpIn = path.join(
    os.tmpdir(),
    `asset-in-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  const tmpResized = path.join(
    os.tmpdir(),
    `asset-resized-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  const tmpOut = path.join(
    os.tmpdir(),
    `asset-opt-${Date.now()}-${Math.random().toString(36).slice(2)}${outputExt}`
  );

  try {
    await fs.writeFile(tmpIn, originalBytes);

    if (outputFormat === 'webp') {
      const cwebpAvailable = await ensureCwebpAvailability();
      if (!cwebpAvailable) {
        throw new Error(
          "WebP conversion requires 'cwebp' (install via: brew install webp)."
        );
      }

      let cwebpInput = tmpIn;
      try {
        await execFileAsync('sips', ['-Z', String(profile.maxDim), tmpIn, '--out', tmpResized]);
        cwebpInput = tmpResized;
      } catch {
        // If sips resize fails, continue with original bytes as input.
      }

      await execFileAsync('cwebp', [
        '-quiet',
        '-q',
        String(profile.quality),
        cwebpInput,
        '-o',
        tmpOut,
      ]);

      const optimizedWebp = await fs.readFile(tmpOut);
      return {
        bytes: optimizedWebp,
        contentType: 'image/webp',
      };
    }

    const args: string[] = [];
    if (outputFormat === 'jpeg') {
      args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', String(profile.quality));
    } else if (ext === '.jpg' || ext === '.jpeg') {
      args.push('-s', 'formatOptions', String(profile.quality));
    }
    args.push('-Z', String(profile.maxDim), tmpIn, '--out', tmpOut);

    await execFileAsync('sips', args);
    const optimized = await fs.readFile(tmpOut);

    // Keep original if optimization somehow produced a larger file.
    if (optimized.length >= originalBytes.length) {
      return { bytes: originalBytes, contentType: originalContentType };
    }

    return {
      bytes: optimized,
      contentType: getContentTypeForFormat(`file${ext}`, outputFormat),
    };
  } catch (error) {
    if (relativePath.includes('images/comic/') && outputFormat === 'webp') {
      throw new Error(
        `WebP conversion failed for ${relativePath}: ${(error as Error).message}`
      );
    }
    console.warn(`Optimization skipped for ${relativePath}: ${(error as Error).message}`);
    return { bytes: originalBytes, contentType: originalContentType };
  } finally {
    await fs.unlink(tmpIn).catch(() => undefined);
    await fs.unlink(tmpResized).catch(() => undefined);
    await fs.unlink(tmpOut).catch(() => undefined);
  }
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

type BucketEntry = {
  name: string;
  id: string | null;
};

async function listBucketFilesRecursive(
  supabase: any,
  bucket: string,
  prefix = ''
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Failed listing '${bucket}/${prefix}': ${error.message}`);
    }

    const entries = (data || []) as BucketEntry[];
    for (const entry of entries) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        const nested = await listBucketFilesRecursive(supabase, bucket, entryPath);
        files.push(...nested);
      } else if (isSupportedAsset(entryPath)) {
        files.push(entryPath);
      }
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return files;
}

async function downloadFromBucket(
  supabase: any,
  bucket: string,
  relativePath: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(relativePath);
  if (error || !data) {
    throw new Error(error?.message || 'Unknown download error');
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in environment.');
  if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY in environment.');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const localAssetsExist = await exists(ASSETS_DIR);
  let relativePaths: string[] = [];

  if (localAssetsExist) {
    const files = (await walk(ASSETS_DIR)).filter(isSupportedAsset);
    relativePaths = files.map((fullPath) => path.relative(ASSETS_DIR, fullPath).split(path.sep).join('/'));
    console.log(`Uploading ${relativePaths.length} local assets from '${ASSETS_DIR}' to bucket '${BUCKET}'...`);
  } else {
    relativePaths = await listBucketFilesRecursive(supabase, SOURCE_BUCKET);
    console.log(
      `Local assets folder not found. Mirroring ${relativePaths.length} assets from source bucket '${SOURCE_BUCKET}' to '${BUCKET}'...`
    );
  }

  const hasNonWebpComicSources = relativePaths.some((relativePath) => {
    if (!relativePath.includes('images/comic/')) return false;
    const ext = path.extname(relativePath).toLowerCase();
    return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
  });
  if (hasNonWebpComicSources) {
    const cwebpAvailable = await ensureCwebpAvailability();
    if (!cwebpAvailable) {
      throw new Error(
        "Comic WebP migration requires 'cwebp'. Install it with `brew install webp`, then re-run `npm run upload-assets`."
      );
    }
  }

  for (const relativePath of relativePaths) {
    const ext = path.extname(relativePath).toLowerCase();
    const original = localAssetsExist
      ? await fs.readFile(path.join(ASSETS_DIR, relativePath))
      : await downloadFromBucket(supabase, SOURCE_BUCKET, relativePath);
    const optimizedAsset =
      ext === '.png' || ext === '.jpg' || ext === '.jpeg'
        ? await optimizeImageForMobile(original, ext, relativePath)
        : { bytes: original, contentType: getContentTypeFromExt(ext) };
    const bytes = optimizedAsset.bytes;
    const uploadPath = getUploadPath(relativePath, optimizedAsset.contentType);

    const { error } = await supabase.storage.from(BUCKET).upload(uploadPath, bytes, {
      cacheControl: '31536000',
      upsert: true,
      contentType: optimizedAsset.contentType,
    });

    if (error) {
      console.error(`Failed: ${uploadPath} -> ${error.message}`);
      continue;
    }

    const legacyPaths = getLegacyImagePaths(uploadPath).filter((legacy) => legacy !== uploadPath);
    if (legacyPaths.length > 0) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove(legacyPaths);
      if (removeError) {
        console.warn(`Failed to remove legacy image files for ${uploadPath}: ${removeError.message}`);
      }
    }

    const savings = Math.max(0, original.length - bytes.length);
    const savingsPct = original.length > 0 ? ((savings / original.length) * 100).toFixed(1) : '0.0';
    console.log(
      `Uploaded: ${uploadPath} (${Math.round(original.length / 1024)}KB -> ${Math.round(
        bytes.length / 1024
      )}KB, -${savingsPct}%)`
    );
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
