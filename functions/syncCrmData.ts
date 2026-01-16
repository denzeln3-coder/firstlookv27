import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crmType, dealRoomId, action } = await req.json();

    // Get deal room data
    const dealRoom = await base44.entities.DealRoom.list().then(rooms => 
      rooms.find(r => r.id === dealRoomId)
    );

    if (!dealRoom) {
      return Response.json({ error: 'Deal room not found' }, { status: 404 });
    }

    // Get related data
    const [messages, meetings, founder, investor, pitch] = await Promise.all([
      base44.entities.DealRoomMessage.filter({ deal_room_id: dealRoomId }),
      base44.entities.DealMeeting.filter({ deal_room_id: dealRoomId }),
      base44.entities.User.list().then(users => users.find(u => u.id === dealRoom.founder_id)),
      base44.entities.User.list().then(users => users.find(u => u.id === dealRoom.investor_id)),
      base44.entities.Pitch.list().then(pitches => pitches.find(p => p.id === dealRoom.pitch_id))
    ]);

    let result;

    if (crmType === 'salesforce') {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('salesforce');
      result = await syncToSalesforce(accessToken, dealRoom, founder, investor, pitch, messages, meetings, action);
    } else if (crmType === 'hubspot') {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('hubspot');
      result = await syncToHubspot(accessToken, dealRoom, founder, investor, pitch, messages, meetings, action);
    } else {
      return Response.json({ error: 'Invalid CRM type' }, { status: 400 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('CRM sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncToSalesforce(accessToken, dealRoom, founder, investor, pitch, messages, meetings, action) {
  // Get Salesforce instance URL from token response or use default
  const instanceUrl = 'https://na1.salesforce.com'; // This should come from OAuth response

  // Create or update Contact for Investor
  const contactData = {
    FirstName: investor?.display_name?.split(' ')[0] || 'Unknown',
    LastName: investor?.display_name?.split(' ').slice(1).join(' ') || 'Investor',
    Email: investor?.email,
    Description: `Investor interested in ${pitch?.startup_name}`
  };

  const contactResponse = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Contact`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  const contact = await contactResponse.json();

  // Create or update Opportunity (Deal)
  const opportunityData = {
    Name: `${pitch?.startup_name} - ${investor?.display_name}`,
    StageName: dealRoom.status === 'active' ? 'Prospecting' :
               dealRoom.status === 'due_diligence' ? 'Qualification' :
               dealRoom.status === 'term_sheet' ? 'Proposal' :
               dealRoom.status === 'closed' ? 'Closed Won' : 'Closed Lost',
    CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Description: pitch?.one_liner
  };

  const oppResponse = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Opportunity`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opportunityData)
  });

  const opportunity = await oppResponse.json();

  // Log activities (messages)
  for (const message of messages.slice(-5)) {
    await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Subject: 'Deal Room Message',
        Description: message.content,
        Status: 'Completed',
        ActivityDate: new Date(message.created_date).toISOString().split('T')[0]
      })
    });
  }

  return { contactId: contact.id, opportunityId: opportunity.id };
}

async function syncToHubspot(accessToken, dealRoom, founder, investor, pitch, messages, meetings, action) {
  const baseUrl = 'https://api.hubapi.com';

  // Create or update Contact for Investor
  const contactData = {
    properties: {
      email: investor?.email,
      firstname: investor?.display_name?.split(' ')[0] || 'Unknown',
      lastname: investor?.display_name?.split(' ').slice(1).join(' ') || 'Investor',
      company: investor?.company_name || '',
      lifecyclestage: 'opportunity'
    }
  };

  const contactResponse = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  const contact = await contactResponse.json();

  // Create Company for Startup
  const companyData = {
    properties: {
      name: pitch?.startup_name,
      domain: pitch?.product_url?.replace(/^https?:\/\//, '').split('/')[0],
      industry: pitch?.category,
      description: pitch?.one_liner
    }
  };

  const companyResponse = await fetch(`${baseUrl}/crm/v3/objects/companies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(companyData)
  });

  const company = await companyResponse.json();

  // Create Deal
  const dealData = {
    properties: {
      dealname: `${pitch?.startup_name} - ${investor?.display_name}`,
      dealstage: dealRoom.status === 'active' ? 'qualifiedtobuy' :
                 dealRoom.status === 'due_diligence' ? 'presentationscheduled' :
                 dealRoom.status === 'term_sheet' ? 'decisionmakerboughtin' :
                 dealRoom.status === 'closed' ? 'closedwon' : 'closedlost',
      pipeline: 'default',
      amount: '0',
      closedate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  const dealResponse = await fetch(`${baseUrl}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dealData)
  });

  const deal = await dealResponse.json();

  return { contactId: contact.id, companyId: company.id, dealId: deal.id };
}