import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, type, fromUserId, pitchId, message, actionUrl } = await req.json();

    // Validate required fields
    if (!userId || !type || !message) {
      return Response.json({ 
        error: 'Missing required fields: userId, type, message' 
      }, { status: 400 });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      type: type,
      from_user_id: fromUserId || null,
      pitch_id: pitchId || null,
      message: message,
      action_url: actionUrl || null,
      is_read: false
    });

    return Response.json({ 
      success: true,
      notification 
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});