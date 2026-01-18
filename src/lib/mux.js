// Mux Direct Upload Configuration
// For production, you'd create upload URLs via a backend/edge function
// For now, we'll store video URLs directly

export const MUX_PLAYBACK_URL = 'https://stream.mux.com';

// Helper to get Mux playback URL from playback ID
export function getMuxPlaybackUrl(playbackId, options = {}) {
  if (!playbackId) return null;
  
  const { width, height, time } = options;
  let url = `${MUX_PLAYBACK_URL}/${playbackId}.m3u8`;
  
  return url;
}

// Helper to get Mux thumbnail URL
export function getMuxThumbnailUrl(playbackId, options = {}) {
  if (!playbackId) return null;
  
  const { width = 640, height = 360, time = 0 } = options;
  return `https://image.mux.com/${playbackId}/thumbnail.png?width=${width}&height=${height}&time=${time}`;
}

// Helper to get Mux GIF URL (for previews)
export function getMuxGifUrl(playbackId, options = {}) {
  if (!playbackId) return null;
  
  const { width = 320, fps = 15, start = 0, end = 5 } = options;
  return `https://image.mux.com/${playbackId}/animated.gif?width=${width}&fps=${fps}&start=${start}&end=${end}`;
}
