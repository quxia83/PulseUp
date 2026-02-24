import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';

export interface PickedVideo {
  uri: string;
  thumbnailUri: string | null;
}

export async function pickVideoFromGallery(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
    videoMaxDuration: 600,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  let uri = result.assets[0].uri;

  // On iOS, expo-image-picker may return a ph:// PHAsset URI.
  // expo-video requires a file:// URI to stream, so copy to cache if needed.
  if (uri.startsWith('ph://')) {
    const dest = `${FileSystem.cacheDirectory}pulseup_video_${Date.now()}.mov`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    uri = dest;
  }

  let thumbnailUri: string | null = null;
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.6 });
    thumbnailUri = thumb.uri;
  } catch {
    // Thumbnail failure is non-fatal
  }

  return { uri, thumbnailUri };
}
