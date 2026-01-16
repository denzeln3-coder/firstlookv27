/**
 * Video Compression Utility
 * Compresses videos to stay under upload limits while maintaining quality
 */

export async function compressVideo(videoBlob, targetSizeMB = 50) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);

    // Set a timeout for metadata loading to prevent indefinite hanging
    let metadataTimeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      resolve({ 
        blob: videoBlob, 
        compressed: false, 
        error: true, 
        errorMessage: 'Metadata loading timed out' 
      });
    }, 10000); // 10 seconds timeout
    
    video.onloadedmetadata = async () => {
      clearTimeout(metadataTimeout);
      
      const duration = video.duration;
      const currentSizeMB = videoBlob.size / (1024 * 1024);
      
      if (currentSizeMB <= targetSizeMB) {
        URL.revokeObjectURL(video.src);
        resolve({ blob: videoBlob, compressed: false, originalSize: currentSizeMB, finalSize: currentSizeMB });
        return;
      }
      
      const compressionRatio = targetSizeMB / currentSizeMB;

      // More aggressive quality scaling
      let quality = 0.85;
      if (compressionRatio < 0.7) quality = 0.75;
      if (compressionRatio < 0.5) quality = 0.65;
      if (compressionRatio < 0.3) quality = 0.55;
      if (compressionRatio < 0.15) quality = 0.45;

      // More aggressive resolution scaling
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (compressionRatio < 0.3) {
        width = Math.floor(width * 0.6);
        height = Math.floor(height * 0.6);
      } else if (compressionRatio < 0.5) {
        width = Math.floor(width * 0.7);
        height = Math.floor(height * 0.7);
      } else if (compressionRatio < 0.7) {
        width = Math.floor(width * 0.85);
        height = Math.floor(height * 0.85);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      try {
        const stream = canvas.captureStream(30);

        let mimeType = 'video/webm;codecs=vp9';
        // More precise bitrate calculation based on target size and duration
        let videoBitsPerSecond = Math.floor((targetSizeMB * 8 * 1024 * 1024) / duration * 0.9);
        
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
        
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          videoBitsPerSecond = Math.floor(1500000 * compressionRatio);
        }
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond,
          audioBitsPerSecond: 64000
        });
        
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: mimeType });
          const finalSizeMB = compressedBlob.size / (1024 * 1024);
          
          URL.revokeObjectURL(video.src);
          
          resolve({
            blob: compressedBlob,
            compressed: true,
            originalSize: currentSizeMB,
            finalSize: finalSizeMB,
            compressionRatio: (finalSizeMB / currentSizeMB * 100).toFixed(1)
          });
        };
        
        mediaRecorder.onerror = (error) => {
          console.error('Compression error:', error);
          URL.revokeObjectURL(video.src);
          resolve({ 
            blob: videoBlob, 
            compressed: false, 
            error: true, 
            errorMessage: error.message 
          });
        };
        
        mediaRecorder.start(100);
        
        video.currentTime = 0;
        video.play();
        
        const drawFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(drawFrame);
        };
        
        video.onplay = () => {
          drawFrame();
        };
        
        video.onended = () => {
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 100);
        };
        
      } catch (error) {
        console.error('MediaRecorder error:', error);
        URL.revokeObjectURL(video.src);
        resolve({ 
          blob: videoBlob, 
          compressed: false, 
          error: true, 
          errorMessage: error.message 
        });
      }
    };
    
    video.onerror = () => {
      clearTimeout(metadataTimeout);
      URL.revokeObjectURL(video.src);
      resolve({ 
        blob: videoBlob, 
        compressed: false, 
        error: true, 
        errorMessage: 'Failed to load video' 
      });
    };
  });
}