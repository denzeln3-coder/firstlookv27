import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, type, message } = await req.json();

    // Get user details
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.id === userId);

    if (!user || !user.email) {
      return Response.json({ error: 'User not found or no email' }, { status: 404 });
    }

    // Send email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      from_name: 'FirstLook',
      subject: getEmailSubject(type),
      body: getEmailBody(type, message, user)
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getEmailSubject(type) {
  switch (type) {
    case 'follow':
      return '🎉 You have a new follower on FirstLook!';
    case 'upvote':
      return '🚀 Your pitch got an upvote!';
    case 'comment_reply':
      return '💬 Someone replied to your comment';
    default:
      return '🔔 New notification from FirstLook';
  }
}

function getEmailBody(type, message, user) {
  return `
    Hi ${user.display_name || user.full_name || 'there'},

    ${message}

    View your notifications: ${Deno.env.get('APP_URL') || 'https://firstlook.app'}

    Best,
    The FirstLook Team

    ---
    You're receiving this because you have an account on FirstLook.
  `;
}