import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Video Transcoding Function
 * Transcodes uploaded videos to optimized MP4 format for mobile viewing
 * Uses FFmpeg to ensure:
 * - Codec: H.264 baseline profile (maximum compatibility)
 * - Resolution: Optimized for mobile (max 1280x720 for standard, scales down for slower connections)
 * - Bitrate: 1500kbps video, 128kbps audio (good quality at small file size)
 * - Format: MP4 with faststart for quick streaming
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_url, pitch_id } = await req.json();

    if (!video_url) {
      return Response.json({ error: 'video_url is required' }, { status: 400 });
    }

    console.log(`[Transcode] Starting for pitch ${pitch_id || 'unknown'}`);
    console.log(`[Transcode] Source video URL: ${video_url.substring(0, 50)}...`);

    // Download the video file
    console.log('[Transcode] Downloading video...');
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoSize = videoBuffer.byteLength / (1024 * 1024);
    console.log(`[Transcode] Downloaded ${videoSize.toFixed(2)}MB`);

    // Save to temp file
    const tempInputPath = `/tmp/input_${Date.now()}.mp4`;
    const tempOutputPath = `/tmp/output_${Date.now()}.mp4`;

    await Deno.writeFile(tempInputPath, new Uint8Array(videoBuffer));
    console.log(`[Transcode] Saved to ${tempInputPath}`);

    // Transcode using FFmpeg
    console.log('[Transcode] Starting FFmpeg transcoding...');
    const transcodingStartTime = Date.now();

    // FFmpeg command optimized for mobile:
    // -c:v libx264: H.264 codec
    // -profile:v baseline: Maximum compatibility
    // -level 3.0: Baseline level for mobile devices
    // -b:v 1500k: Video bitrate optimized for mobile
    // -maxrate 2000k: Cap bitrate
    // -bufsize 4000k: Buffer size
    // -vf scale=1280:720: Scale to max resolution, maintain aspect
    // -c:a aac: AAC audio codec
    // -b:a 128k: Audio bitrate
    // -movflags +faststart: Put MOOV atom at beginning for fast streaming
    const ffmpegCmd = new Deno.Command('ffmpeg', {
      args: [
        '-i', tempInputPath,
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-b:v', '1500k',
        '-maxrate', '2000k',
        '-bufsize', '4000k',
        '-vf', 'scale=\'min(1280,iw)\':\'min(720,ih)\':force_original_aspect_ratio=decrease',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', // Overwrite output file
        tempOutputPath
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    const transcodingProcess = ffmpegCmd.spawn();
    const { success } = await transcodingProcess.output();

    if (!success) {
      const stderr = new TextDecoder().decode(transcodingProcess.stderr);
      throw new Error(`FFmpeg transcoding failed: ${stderr}`);
    }

    const transcodingTime = ((Date.now() - transcodingStartTime) / 1000).toFixed(1);
    console.log(`[Transcode] Transcoding completed in ${transcodingTime}s`);

    // Read transcoded file
    const transcodedBuffer = await Deno.readFile(tempOutputPath);
    const transcodedSize = transcodedBuffer.byteLength / (1024 * 1024);
    const compressionRatio = ((1 - transcodedSize / videoSize) * 100).toFixed(1);
    console.log(`[Transcode] Transcoded size: ${transcodedSize.toFixed(2)}MB (${compressionRatio}% reduction)`);

    // Upload transcoded video
    console.log('[Transcode] Uploading transcoded video...');
    const transcodedFile = new File([transcodedBuffer], 'video-transcoded.mp4', { type: 'video/mp4' });

    const uploadResult = await base44.integrations.Core.UploadFile({
      file: transcodedFile
    });

    console.log(`[Transcode] Upload successful: ${uploadResult.file_url.substring(0, 50)}...`);

    // Cleanup temp files
    try {
      await Deno.remove(tempInputPath);
      await Deno.remove(tempOutputPath);
      console.log('[Transcode] Cleaned up temp files');
    } catch (cleanupErr) {
      console.warn('[Transcode] Temp file cleanup warning:', cleanupErr.message);
    }

    return Response.json({
      success: true,
      original_size_mb: videoSize.toFixed(2),
      transcoded_size_mb: transcodedSize.toFixed(2),
      compression_ratio_percent: compressionRatio,
      transcoded_url: uploadResult.file_url,
      transcoding_time_seconds: transcodingTime,
      format: 'H.264 MP4 (mobile optimized)',
      pitch_id: pitch_id
    });
  } catch (error) {
    console.error('[Transcode] Error:', error.message);
    return Response.json({ 
      error: error.message || 'Video transcoding failed',
      success: false
    }, { status: 500 });
  }
});