import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

export interface PickedVideo {
  uri: string;
  thumbnailUri: string | null;
}

export async function pickVideoFromGallery(): Promise<PickedVideo | null> {
  await ImagePicker.requestMediaLibraryPermissionsAsync();

  // allowsEditing: true forces iOS to use the video trimmer export path
  // which avoids PHPhotosErrorDomain error 3164 that occurs with
  // PHPicker's NSItemProvider export on certain videos.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: 600,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const uri = result.assets[0].uri;

  let thumbnailUri: string | null = null;
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.6 });
    thumbnailUri = thumb.uri;
  } catch {
    // Thumbnail failure is non-fatal
  }

  return { uri, thumbnailUri };
}
