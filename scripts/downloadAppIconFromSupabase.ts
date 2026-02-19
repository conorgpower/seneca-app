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
const SOURCE_BUCKET = process.env.SUPABASE_ASSET_BUCKET || 'app-assets';
const OPTIMIZED_BUCKET = process.env.SUPABASE_OPTIMIZED_ASSET_BUCKET || 'app-assets-mobile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const IOS_ICON_PATH = path.join(
  ROOT_DIR,
  'ios',
  'SenecaChat',
  'Images.xcassets',
  'AppIcon.appiconset',
  'App-Icon-1024x1024@1x.png'
);
const execFileAsync = promisify(execFile);

const DEFAULT_CANDIDATE_PATHS = [
  'images/logos/app-icon.png',
  'images/logos/icon.png',
  'images/app-icon.png',
  'app-icon.png',
  'icon.png',
];

type CliOptions = {
  remotePath?: string;
  bucket?: string;
};

type StorageDownloadClient = {
  storage: {
    from: (bucket: string) => {
      download: (
        path: string
      ) => Promise<{ data: { arrayBuffer: () => Promise<ArrayBuffer> } | null; error: unknown }>;
    };
  };
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--remote-path') {
      options.remotePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--bucket') {
      options.bucket = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return options;
}

async function downloadFirstAvailable(
  bucket: string,
  paths: string[],
  supabase: StorageDownloadClient
): Promise<{ remotePath: string; bytes: Buffer }> {
  for (const remotePath of paths) {
    const { data, error } = await supabase.storage.from(bucket).download(remotePath);
    if (error || !data) continue;

    const arrayBuffer = await data.arrayBuffer();
    return { remotePath, bytes: Buffer.from(arrayBuffer) };
  }

  throw new Error(
    `Could not download icon from bucket '${bucket}'. Checked paths: ${paths.join(', ')}`
  );
}

async function writeIconTargets(iconBytes: Buffer): Promise<void> {
  const normalizedIcon = await normalizeToIosAppIconPng(iconBytes);

  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const targets = [
    path.join(ASSETS_DIR, 'icon.png'),
    path.join(ASSETS_DIR, 'adaptive-icon.png'),
    path.join(ASSETS_DIR, 'favicon.png'),
  ];

  await Promise.all(targets.map((target) => fs.writeFile(target, normalizedIcon)));
  console.log(`Wrote local Expo icon files to ${ASSETS_DIR}`);

  try {
    await fs.mkdir(path.dirname(IOS_ICON_PATH), { recursive: true });
    await fs.writeFile(IOS_ICON_PATH, normalizedIcon);
    console.log(`Updated iOS app icon asset at ${IOS_ICON_PATH}`);
  } catch (error) {
    console.warn(`Skipped iOS icon write: ${(error as Error).message}`);
  }
}

async function getImageDimensionsWithSips(filePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
  const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);
  if (!widthMatch || !heightMatch) {
    throw new Error(`Unable to parse dimensions from sips output for '${filePath}'.`);
  }
  return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
}

async function normalizeToIosAppIconPng(inputBytes: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const tmpInput = path.join(tmpDir, `icon-in-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const tmpOutput = path.join(tmpDir, `icon-out-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);

  try {
    await fs.writeFile(tmpInput, inputBytes);

    // Force conversion to PNG and required 1024x1024 dimensions for iOS app icon catalogs.
    await execFileAsync('sips', ['-s', 'format', 'png', '-z', '1024', '1024', tmpInput, '--out', tmpOutput]);

    const dims = await getImageDimensionsWithSips(tmpOutput);
    if (dims.width !== 1024 || dims.height !== 1024) {
      throw new Error(`Normalized icon is ${dims.width}x${dims.height}; expected 1024x1024.`);
    }

    return await fs.readFile(tmpOutput);
  } catch (error) {
    throw new Error(
      `Failed to normalize icon to 1024x1024 PNG. ${(error as Error).message}`
    );
  } finally {
    await fs.unlink(tmpInput).catch(() => undefined);
    await fs.unlink(tmpOutput).catch(() => undefined);
  }
}

async function main() {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in environment.');
  if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY in environment.');

  const options = parseArgs(process.argv.slice(2));
  const bucket = options.bucket || SOURCE_BUCKET;
  const remotePaths = options.remotePath
    ? [options.remotePath]
    : [...DEFAULT_CANDIDATE_PATHS];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const attempt = await downloadFirstAvailable(bucket, remotePaths, supabase).then((result) => ({
    ...result,
    usedBucket: bucket,
  })).catch(
    async (primaryError) => {
      if (options.bucket || bucket === OPTIMIZED_BUCKET) throw primaryError;

      console.log(
        `Icon not found in '${bucket}'. Retrying in optimized bucket '${OPTIMIZED_BUCKET}'...`
      );
      const fallback = await downloadFirstAvailable(OPTIMIZED_BUCKET, remotePaths, supabase);
      return { ...fallback, usedBucket: OPTIMIZED_BUCKET };
    }
  );

  await writeIconTargets(attempt.bytes);

  console.log(`Downloaded icon from '${attempt.usedBucket}' path '${attempt.remotePath}'`);
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
