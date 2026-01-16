import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { pitchId, status, feedback } = await req.json();

    if (!pitchId || !status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get pitch to find founder
    const pitches = await base44.asServiceRole.entities.Pitch.list();
    const pitch = pitches.find(p => p.id === pitchId);

    if (!pitch || !pitch.founder_id) {
      return Response.json({ error: 'Pitch or founder not found' }, { status: 404 });
    }

    // Create notification based on status
    let notifType, notifMessage;
    
    if (status === 'approved') {
      notifType = 'pitch_approved';
      notifMessage = `🎉 Your pitch "${pitch.startup_name}" has been approved and is now live!`;
    } else if (status === 'rejected') {
      notifType = 'pitch_rejected';
      notifMessage = `Your pitch "${pitch.startup_name}" was not approved. ${feedback || ''}`;
    } else if (status === 'needs_revision') {
      notifType = 'pitch_needs_revision';
      notifMessage = `Your pitch "${pitch.startup_name}" needs some updates. ${feedback || ''}`;
    } else {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    await base44.asServiceRole.functions.invoke('createNotification', {
      userId: pitch.founder_id,
      type: notifType,
      pitchId: pitch.id,
      message: notifMessage,
      actionUrl: `/Explore?pitch=${pitch.id}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});