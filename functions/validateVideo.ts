import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_url, pitch_id } = await req.json();

    if (!video_url) {
      return Response.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Fetch video headers to validate
    const videoResponse = await fetch(video_url, { method: 'HEAD' });
    
    if (!videoResponse.ok) {
      return Response.json({
        valid: false,
        error: 'Video file not accessible',
        details: `HTTP ${videoResponse.status}`
      });
    }

    const contentType = videoResponse.headers.get('content-type');
    const contentLength = videoResponse.headers.get('content-length');

    // Validate content type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!contentType || !validTypes.some(type => contentType.includes(type))) {
      return Response.json({
        valid: false,
        error: 'Invalid video format',
        details: `Received: ${contentType}. Expected: MP4, WebM, or MOV`
      });
    }

    // Validate file size (max 100MB)
    const sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
    if (sizeMB > 100) {
      return Response.json({
        valid: false,
        error: 'Video file too large',
        details: `${sizeMB.toFixed(1)}MB exceeds 100MB limit`
      });
    }

    // Attempt to fetch a small portion to verify readability
    const partialResponse = await fetch(video_url, {
      headers: { 'Range': 'bytes=0-1024' }
    });

    if (!partialResponse.ok && partialResponse.status !== 206) {
      return Response.json({
        valid: false,
        error: 'Video file cannot be read',
        details: 'Partial content request failed'
      });
    }

    // Log validation success
    console.log(`✅ Video validated: ${pitch_id || 'unknown'} - ${sizeMB.toFixed(1)}MB - ${contentType}`);

    return Response.json({
      valid: true,
      size_mb: sizeMB,
      format: contentType,
      message: 'Video validated successfully'
    });

  } catch (error) {
    console.error('Video validation error:', error);
    return Response.json({
      valid: false,
      error: 'Validation failed',
      details: error.message
    }, { status: 500 });
  }
});