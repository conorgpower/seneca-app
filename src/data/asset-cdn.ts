import Constants from 'expo-constants';
import { ImageSourcePropType } from 'react-native';

const supabaseUrl = (Constants.expoConfig?.extra?.supabaseUrl as string | undefined)?.replace(/\/$/, '');
const originalAssetBucket =
  (Constants.expoConfig?.extra?.supabaseAssetBucket as string | undefined) || 'app-assets';
const optimizedAssetBucket =
  (Constants.expoConfig?.extra?.supabaseOptimizedAssetBucket as string | undefined) || originalAssetBucket;

function getSupabaseAssetPublicUrl(path: string, bucket: string): string | null {
  if (!supabaseUrl) return null;

  const encodedPath = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function getSupabaseImageUrl(path: string): string | null {
  return getSupabaseAssetPublicUrl(path, optimizedAssetBucket);
}

export function getSupabaseImageSource(path: string): ImageSourcePropType | null {
  const uri = getSupabaseImageUrl(path);
  if (!uri) return null;

  return {
    uri,
    cache: 'force-cache',
  };
}

export function getSupabaseAudioSource(path: string): string | null {
  return getSupabaseAssetPublicUrl(path, originalAssetBucket);
}
