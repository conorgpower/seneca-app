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
const OUTPUT_DIR = path.resolve(__dirname, '../assets/app-assets');

function isSupportedAsset(filePath: string): boolean {
  return /\.(png|jpg|jpeg|webp|mp3|m4a|wav|gif|svg)$/i.test(filePath);
}

type BucketEntry = { name: string; id: string | null };

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

async function main() {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in environment.');
  if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY in environment.');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`Listing files in bucket '${BUCKET}'...`);
  const files = await listBucketFilesRecursive(supabase, BUCKET);
  console.log(`Found ${files.length} assets. Downloading to '${OUTPUT_DIR}'...`);

  let downloaded = 0;
  let failed = 0;

  for (const relativePath of files) {
    const outputPath = path.join(OUTPUT_DIR, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const { data, error } = await supabase.storage.from(BUCKET).download(relativePath);
    if (error || !data) {
      console.error(`Failed: ${relativePath} -> ${error?.message || 'Unknown error'}`);
      failed++;
      continue;
    }

    const arrayBuffer = await data.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    const sizeKB = Math.round(arrayBuffer.byteLength / 1024);
    console.log(`Downloaded: ${relativePath} (${sizeKB}KB)`);
    downloaded++;
  }

  console.log(`\nDone. ${downloaded} downloaded, ${failed} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
