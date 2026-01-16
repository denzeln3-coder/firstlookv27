import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isInvestor } = await req.json();

    if (isInvestor) {
      // Generate matches for investor
      const investors = await base44.asServiceRole.entities.Investor.filter({ user_id: userId });
      const investor = investors[0];

      if (!investor) {
        return Response.json({ error: 'Investor profile not found' }, { status: 404 });
      }

      // Get all published pitches
      const allPitches = await base44.asServiceRole.entities.Pitch.filter({ is_published: true });
      const allUsers = await base44.asServiceRole.entities.User.list();

      // Use AI to analyze and match
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert investor-startup matching system. Analyze this investor profile and match with relevant startups.

Investor Profile:
- Type: ${investor.investor_type}
- Investment Thesis: ${investor.investment_thesis}
- Preferred Categories: ${investor.preferred_categories.join(', ')}
- Preferred Stages: ${investor.preferred_stages.join(', ')}
- Check Size: $${investor.ticket_size_min} - $${investor.ticket_size_max}
- Looking For: ${investor.looking_for || 'Not specified'}

Available Startups (${allPitches.length} total):
${allPitches.slice(0, 30).map((p, i) => {
  const founder = allUsers.find(u => u.id === p.founder_id);
  return `${i + 1}. ${p.startup_name} (${p.category}) - ${p.one_liner} - Stage: ${p.product_stage} - Founder: ${founder?.display_name || 'Unknown'}`;
}).join('\n')}

Generate the top 10 matches with:
1. Match score (0-100)
2. Clear explanation why this is a good match
3. Key alignment points (max 3)
4. Personalized outreach template (150-200 words) - This should be a complete, ready-to-send message that highlights the match and value proposition

Consider:
- Category alignment
- Stage alignment
- Founder background
- Market opportunity
- Investment thesis fit`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pitch_id: { type: "string" },
                  founder_id: { type: "string" },
                  match_score: { type: "number" },
                  match_reason: { type: "string" },
                  key_alignments: {
                    type: "array",
                    items: { type: "string" }
                  },
                  outreach_template: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save matches
      for (const match of result.matches) {
        const existingMatches = await base44.asServiceRole.entities.InvestorMatch.filter({
          investor_id: investor.id,
          founder_id: match.founder_id
        });

        if (existingMatches.length === 0) {
          await base44.asServiceRole.entities.InvestorMatch.create({
            investor_id: investor.id,
            founder_id: match.founder_id,
            pitch_id: match.pitch_id,
            match_score: match.match_score,
            match_reason: match.match_reason,
            key_alignments: match.key_alignments,
            outreach_template: match.outreach_template,
            status: 'suggested'
          });
        }
      }

      return Response.json({ success: true, matchCount: result.matches.length });
    } else {
      // Generate matches for founder
      const founderPitches = await base44.asServiceRole.entities.Pitch.filter({ 
        founder_id: userId,
        is_published: true 
      });

      if (founderPitches.length === 0) {
        return Response.json({ error: 'No published pitches found' }, { status: 404 });
      }

      const pitch = founderPitches[0];
      const founder = await base44.asServiceRole.entities.User.list().then(users => 
        users.find(u => u.id === userId)
      );

      // Get all active investors
      const allInvestors = await base44.asServiceRole.entities.Investor.filter({ is_active: true });
      const allUsers = await base44.asServiceRole.entities.User.list();

      // Use AI to analyze and match
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert investor-startup matching system. Analyze this startup and match with relevant investors.

Startup Profile:
- Name: ${pitch.startup_name}
- Category: ${pitch.category}
- Stage: ${pitch.product_stage}
- One-liner: ${pitch.one_liner}
- Problem: ${pitch.what_problem_do_you_solve}
- Founder Bio: ${founder?.bio || 'Not specified'}
- Founder Expertise: ${founder?.expertise?.join(', ') || 'Not specified'}

Available Investors (${allInvestors.length} total):
${allInvestors.slice(0, 30).map((inv, i) => {
  const investorUser = allUsers.find(u => u.id === inv.user_id);
  return `${i + 1}. ${investorUser?.display_name || 'Investor'} (${inv.investor_type}) - ${inv.investment_thesis} - Focus: ${inv.preferred_categories.join(', ')} - Stages: ${inv.preferred_stages.join(', ')}`;
}).join('\n')}

Generate the top 10 matches with:
1. Match score (0-100)
2. Clear explanation why this is a good match
3. Key alignment points (max 3)
4. Personalized outreach template (150-200 words) - This should be a complete, ready-to-send message from the founder to the investor that highlights the match, briefly explains the startup, and requests a conversation

Consider:
- Category alignment
- Stage alignment
- Investment thesis fit
- Check size compatibility
- Investor's current focus`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  investor_id: { type: "string" },
                  match_score: { type: "number" },
                  match_reason: { type: "string" },
                  key_alignments: {
                    type: "array",
                    items: { type: "string" }
                  },
                  outreach_template: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save matches
      for (const match of result.matches) {
        const existingMatches = await base44.asServiceRole.entities.InvestorMatch.filter({
          investor_id: match.investor_id,
          founder_id: userId
        });

        if (existingMatches.length === 0) {
          await base44.asServiceRole.entities.InvestorMatch.create({
            investor_id: match.investor_id,
            founder_id: userId,
            pitch_id: pitch.id,
            match_score: match.match_score,
            match_reason: match.match_reason,
            key_alignments: match.key_alignments,
            outreach_template: match.outreach_template,
            status: 'suggested'
          });
        }
      }

      return Response.json({ success: true, matchCount: result.matches.length });
    }
  } catch (error) {
    console.error('Match generation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate matches' 
    }, { status: 500 });
  }
});