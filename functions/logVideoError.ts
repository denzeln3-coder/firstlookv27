import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { pitch_id, error_type, error_message, user_agent, video_url } = await req.json();

    if (!pitch_id || !error_type) {
      return Response.json({ error: 'pitch_id and error_type required' }, { status: 400 });
    }

    // Log to console for monitoring
    console.error('🎥 VIDEO PLAYBACK ERROR:', {
      pitch_id,
      error_type,
      error_message,
      user_agent,
      video_url: video_url?.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

    // Could extend this to store in a database table for analytics
    // For now, just return success
    return Response.json({ 
      logged: true,
      message: 'Error logged successfully' 
    });

  } catch (error) {
    console.error('Error logging video error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});