export const generateThumbnail = (videoBlob, timeInSeconds = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeInSeconds, video.duration / 2);
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.85);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(videoBlob);
  });
};

export const compressVideo = async (videoBlob) => {
  // For now, return as-is. Can add compression logic later if needed
  return videoBlob;
};