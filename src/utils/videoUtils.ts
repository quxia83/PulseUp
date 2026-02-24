export function isYouTubeUrl(uri: string): boolean {
  return /youtube\.com|youtu\.be/.test(uri);
}

export function isDirectVideoUrl(uri: string): boolean {
  return /\.(mp4|mov|m3u8|webm)(\?|$)/i.test(uri) || uri.startsWith('file://');
}
