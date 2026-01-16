import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channel, message, title, type } = await req.json();

    // Get Slack access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('slack');

    // Format message based on type
    let blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title || '🚀 FirstLook Notification'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ];

    // Add color based on type
    let color = '#6366F1';
    if (type === 'deal_room_update') color = '#8B5CF6';
    if (type === 'investor_match') color = '#22C55E';
    if (type === 'meeting_scheduled') color = '#F59E0B';

    // Send message to Slack
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel || '#firstlook-notifications',
        blocks,
        attachments: [{
          color,
          footer: 'FirstLook',
          footer_icon: 'https://firstlook.app/icon.png',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Failed to send Slack message');
    }

    return Response.json({ success: true, messageId: result.ts });
  } catch (error) {
    console.error('Slack notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});