import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pitchId } = await req.json();

    if (!pitchId) {
      return Response.json({ error: 'Pitch ID is required' }, { status: 400 });
    }

    // Fetch pitch data
    const pitches = await base44.asServiceRole.entities.Pitch.list();
    const pitch = pitches.find(p => p.id === pitchId);

    if (!pitch) {
      return Response.json({ error: 'Pitch not found' }, { status: 404 });
    }

    // Fetch demo data
    const demos = await base44.asServiceRole.entities.Demo.list();
    const demo = demos.find(d => d.pitch_id === pitchId);

    // Analyze pitch with AI
    const analysisPrompt = `You are an expert startup pitch reviewer with deep knowledge of what makes startups succeed. Analyze this pitch submission comprehensively.

Pitch Information:
- Startup Name: ${pitch.startup_name}
- One-Liner: ${pitch.one_liner}
- Category: ${pitch.category || 'Not specified'}
- Problem Statement: ${pitch.what_problem_do_you_solve || 'Not provided'}
- Product URL: ${pitch.product_url || 'Not provided'}
- Product Stage: ${pitch.product_stage || 'Not specified'}
- Demo Video: ${demo ? 'Provided' : 'Not provided'}

SUCCESS FACTORS TO EVALUATE:
1. Problem-Solution Fit: Is the problem real, painful, and widespread?
2. Value Proposition: Is the benefit clear and compelling?
3. Market Opportunity: Does the market size justify the effort?
4. Differentiation: What makes this unique or better?
5. Traction Indicators: Evidence of validation or momentum?
6. Team Credibility: Does the pitch convey expertise?

PITCH DESCRIPTION ANALYSIS:
Evaluate the one-liner and problem statement for:
- Clarity: Is it immediately understandable?
- Specificity: Does it avoid vague buzzwords?
- Impact: Does it convey why this matters?
- Actionability: Can you visualize the solution?

${demo ? `DEMO VIDEO ANALYSIS:
Based on the presence of a demo video, evaluate:
- Does the pitch indicate the demo will show actual product functionality?
- Is there evidence of user-facing features vs just concepts?
- Does the pitch suggest a walkthrough of real use cases?` : ''}

Provide detailed analysis with:
1. Overall quality score (1-100)
2. Clarity score (1-10) - How clear and understandable
3. Completeness score (1-10) - Coverage of key information
4. Market fit score (1-10) - Problem/solution alignment
${demo ? '5. Demo effectiveness score (1-10) - Expected demo quality\n6. Demo feedback (2-3 specific suggestions for the demo)' : '5. Demo feedback (note that demo is missing)'}
7. Pitch description improvements (3-5 specific rewrites or enhancements for the one-liner and problem statement based on startup success patterns)
8. Strengths (3-5 bullet points)
9. Areas for improvement (3-5 actionable items)
10. Suggested category if current doesn't fit
11. Red flags or concerns
12. Overall recommendation (approve, needs_revision, reject)
13. Personalized message to founder (encouraging, specific, actionable)

Be constructive, reference specific startup success patterns, and provide concrete examples.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_score: { type: 'number' },
          clarity_score: { type: 'number' },
          completeness_score: { type: 'number' },
          market_fit_score: { type: 'number' },
          demo_effectiveness_score: { type: 'number' },
          demo_feedback: {
            type: 'array',
            items: { type: 'string' }
          },
          pitch_description_improvements: {
            type: 'array',
            items: { type: 'string' }
          },
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          improvements: {
            type: 'array',
            items: { type: 'string' }
          },
          suggested_category: { type: 'string' },
          red_flags: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendation: { type: 'string' },
          message_to_founder: { type: 'string' }
        }
      }
    });

    // Determine review status based on AI recommendation
    let reviewStatus = 'pending';
    let isPublished = false;
    
    if (analysis.overall_score >= 75 && analysis.red_flags.length === 0) {
      reviewStatus = 'approved';
      isPublished = true;
    } else if (analysis.overall_score >= 50) {
      reviewStatus = 'needs_revision';
    } else if (analysis.red_flags.length > 2 || analysis.overall_score < 40) {
      reviewStatus = 'rejected';
    }

    // Update pitch with AI analysis
    await base44.asServiceRole.entities.Pitch.update(pitchId, {
      quality_score: analysis.overall_score,
      review_status: reviewStatus,
      is_published: isPublished,
      review_notes: JSON.stringify({
        clarity_score: analysis.clarity_score,
        completeness_score: analysis.completeness_score,
        market_fit_score: analysis.market_fit_score,
        demo_effectiveness_score: analysis.demo_effectiveness_score || 0,
        demo_feedback: analysis.demo_feedback || [],
        pitch_description_improvements: analysis.pitch_description_improvements || [],
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        red_flags: analysis.red_flags,
        message: analysis.message_to_founder,
        ai_analyzed: true,
        analyzed_at: new Date().toISOString()
      }),
      flags: analysis.red_flags,
      reviewed_at: new Date().toISOString()
    });

    // Send notification email to founder
    try {
      let emailBody = `Hi ${user.full_name || user.email},\n\nYour pitch for "${pitch.startup_name}" has been analyzed!\n\n`;
      
      if (reviewStatus === 'approved') {
        emailBody += `🎉 Great news! Your pitch scored ${analysis.overall_score}/100 and is now live on FirstLook!\n\n`;
      } else if (reviewStatus === 'needs_revision') {
        emailBody += `Your pitch scored ${analysis.overall_score}/100. We have some suggestions to help you improve:\n\n`;
      } else {
        emailBody += `Your pitch needs some work before it can go live. Score: ${analysis.overall_score}/100\n\n`;
      }

      emailBody += `💪 Strengths:\n${analysis.strengths.map(s => `• ${s}`).join('\n')}\n\n`;
      
      if (analysis.improvements.length > 0) {
        emailBody += `🎯 Areas to Improve:\n${analysis.improvements.map(i => `• ${i}`).join('\n')}\n\n`;
      }

      if (analysis.pitch_description_improvements && analysis.pitch_description_improvements.length > 0) {
        emailBody += `✍️ Pitch Description Suggestions:\n${analysis.pitch_description_improvements.map(i => `• ${i}`).join('\n')}\n\n`;
      }

      if (analysis.demo_feedback && analysis.demo_feedback.length > 0) {
        emailBody += `🎥 Demo Feedback:\n${analysis.demo_feedback.map(f => `• ${f}`).join('\n')}\n\n`;
      }

      emailBody += `\n${analysis.message_to_founder}\n\n`;
      
      if (reviewStatus !== 'approved') {
        emailBody += `\nNot satisfied with the AI review? You can request a manual review from our team in your profile.\n\n`;
      }
      emailBody += `View your pitch: ${Deno.env.get('BASE44_APP_URL') || 'https://firstlook.app'}/Profile\n\n`;
      emailBody += `Best,\nThe FirstLook Team`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `Your FirstLook pitch: ${pitch.startup_name}`,
        body: emailBody
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return Response.json({
      success: true,
      analysis: {
        overall_score: analysis.overall_score,
        clarity_score: analysis.clarity_score,
        completeness_score: analysis.completeness_score,
        market_fit_score: analysis.market_fit_score,
        demo_effectiveness_score: analysis.demo_effectiveness_score || 0,
        demo_feedback: analysis.demo_feedback || [],
        pitch_description_improvements: analysis.pitch_description_improvements || [],
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        suggested_category: analysis.suggested_category,
        red_flags: analysis.red_flags,
        message: analysis.message_to_founder,
        review_status: reviewStatus,
        is_published: isPublished
      }
    });

  } catch (error) {
    console.error('Pitch analysis error:', error);
    return Response.json({ 
      error: 'Failed to analyze pitch',
      details: error.message 
    }, { status: 500 });
  }
});