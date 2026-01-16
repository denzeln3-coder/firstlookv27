/**
 * Client-side video validation before upload
 */

export function validateVideoFile(file) {
  const errors = [];

  // Check file type
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
  if (!validTypes.includes(file.type)) {
    errors.push(`Invalid format: ${file.type}. Please use MP4, WebM, or MOV.`);
  }

  // Check file size (100MB max)
  const maxSizeMB = 100;
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File too large: ${fileSizeMB.toFixed(1)}MB. Maximum is ${maxSizeMB}MB.`);
  }

  // Check minimum size (100KB to catch empty files)
  const minSizeKB = 100;
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB < minSizeKB) {
    errors.push('File too small or corrupted. Please record again.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function validateVideoBlob(blob) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      resolve({
        valid: false,
        errors: ['Video validation timeout. File may be corrupted.']
      });
    }, 10000);

    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      const errors = [];

      // Check duration
      if (video.duration < 1) {
        errors.push('Video too short. Minimum is 1 second.');
      }

      // No maximum duration limit - users can record any length

      // Check dimensions
      if (video.videoWidth < 200 || video.videoHeight < 200) {
        errors.push('Video resolution too low. Minimum is 200x200.');
      }

      URL.revokeObjectURL(video.src);
      resolve({
        valid: errors.length === 0,
        errors,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    video.onerror = (e) => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
      resolve({
        valid: false,
        errors: [`Video could not be loaded: ${e.message || 'Unknown error'}`]
      });
    };

    video.src = URL.createObjectURL(blob);
  });
}