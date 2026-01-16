import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await req.json();

    // Get meeting data
    const meetings = await base44.entities.DealMeeting.list();
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get deal room and participants
    const dealRoom = await base44.entities.DealRoom.list().then(rooms =>
      rooms.find(r => r.id === meeting.deal_room_id)
    );

    const [founder, investor] = await Promise.all([
      base44.entities.User.list().then(users => users.find(u => u.id === dealRoom.founder_id)),
      base44.entities.User.list().then(users => users.find(u => u.id === dealRoom.investor_id))
    ]);

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Create calendar event
    const event = {
      summary: meeting.title,
      description: meeting.agenda || 'Meeting scheduled via FirstLook',
      start: {
        dateTime: new Date(meeting.scheduled_time).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(new Date(meeting.scheduled_time).getTime() + meeting.duration_minutes * 60000).toISOString(),
        timeZone: 'UTC'
      },
      attendees: [
        { email: founder.email },
        { email: investor.email }
      ],
      conferenceData: {
        createRequest: {
          requestId: `firstlook-${meetingId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    const calendarEvent = await response.json();

    // Update meeting with calendar event ID and meet link
    await base44.asServiceRole.entities.DealMeeting.update(meetingId, {
      meeting_url: calendarEvent.hangoutLink || calendarEvent.htmlLink
    });

    return Response.json({ 
      success: true, 
      eventId: calendarEvent.id,
      meetingUrl: calendarEvent.hangoutLink 
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});