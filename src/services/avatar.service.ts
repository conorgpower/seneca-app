import ImageCropPicker from 'react-native-image-crop-picker';
import { Alert } from 'react-native';
import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';

export async function pickAvatarImage(
  source: 'library' | 'camera'
): Promise<{ path: string; mime: string } | null> {
  try {
    const openFn =
      source === 'camera'
        ? ImageCropPicker.openCamera
        : ImageCropPicker.openPicker;

    const image = await openFn({
      width: 400,
      height: 400,
      cropping: true,
      cropperCircleOverlay: true,
      mediaType: 'photo',
      compressImageQuality: 0.7,
    });

    return { path: image.path, mime: image.mime };
  } catch (error: any) {
    // User cancelled — not an error
    if (error?.code === 'E_PICKER_CANCELLED') return null;
    console.error('Image picker error:', error);
    return null;
  }
}

export async function uploadAvatar(
  userId: string,
  image: { path: string; mime: string }
): Promise<string | null> {
  try {
    const ext = image.mime === 'image/png' ? 'png' : 'jpg';
    const contentType = image.mime || 'image/jpeg';
    const filePath = `${userId}/avatar.${ext}`;

    // Use ArrayBuffer for reliable React Native uploads
    const response = await fetch(image.path);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, new Uint8Array(arrayBuffer), {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.error('Avatar upload failed:', uploadError.message);
      Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    // Cache-buster so Image component shows the new avatar immediately
    return `${urlData.publicUrl}?t=${Date.now()}`;
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    Alert.alert('Upload Failed', 'Something went wrong. Please try again.');
    return null;
  }
}

export async function saveAvatarUrl(
  avatarUrl: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });
    if (error) {
      Alert.alert('Error', error.message || 'Failed to save avatar.');
      return { error };
    }
    return { error: null };
  } catch (err: any) {
    Alert.alert('Error', 'Something went wrong saving your avatar.');
    return { error: err };
  }
}

export async function pickAndUploadAvatar(
  userId: string,
  source: 'library' | 'camera',
  refreshSession: () => Promise<void>
): Promise<string | null> {
  const image = await pickAvatarImage(source);
  if (!image) return null;

  const avatarUrl = await uploadAvatar(userId, image);
  if (!avatarUrl) return null;

  const { error } = await saveAvatarUrl(avatarUrl);
  if (error) return null;

  await refreshSession();
  return avatarUrl;
}
