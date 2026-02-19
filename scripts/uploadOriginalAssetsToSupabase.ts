import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET = process.env.SUPABASE_ASSET_BUCKET || 'app-assets';

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

async function main() {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in environment.');
  if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY in environment.');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const files = (await walk(ASSETS_DIR)).filter(isSupportedAsset);
  console.log(`Uploading ${files.length} original assets to bucket '${BUCKET}'...`);

  for (const fullPath of files) {
    const relativePath = path.relative(ASSETS_DIR, fullPath).split(path.sep).join('/');
    const bytes = await fs.readFile(fullPath);

    const { error } = await supabase.storage.from(BUCKET).upload(relativePath, bytes, {
      cacheControl: '31536000',
      upsert: true,
      contentType: getContentType(fullPath),
    });

    if (error) {
      console.error(`Failed: ${relativePath} -> ${error.message}`);
      continue;
    }

    console.log(`Uploaded original: ${relativePath}`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
