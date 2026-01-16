import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { pitchId } = await req.json();

    if (!pitchId) {
      return Response.json({ error: 'pitchId is required' }, { status: 400 });
    }

    // Get the pitch
    const pitches = await base44.asServiceRole.entities.Pitch.list();
    const pitch = pitches.find(p => p.id === pitchId);

    if (!pitch) {
      return Response.json({ error: 'Pitch not found' }, { status: 404 });
    }

    let qualityScore = 0;
    const flags = [];
    let autoApprove = true;

    // A. Content Validation
    // Check product URL
    if (pitch.product_url) {
      try {
        const urlResponse = await fetch(pitch.product_url, { method: 'HEAD' });
        if (urlResponse.ok) {
          qualityScore += 20;
        } else {
          flags.push('product_url_not_accessible');
          autoApprove = false;
        }

        // Check if social media link
        const socialDomains = ['twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'x.com'];
        const url = new URL(pitch.product_url);
        if (socialDomains.some(domain => url.hostname.includes(domain))) {
          flags.push('social_media_url');
          qualityScore -= 10;
        }
      } catch (error) {
        flags.push('invalid_product_url');
        autoApprove = false;
      }
    } else {
      flags.push('no_product_url');
      autoApprove = false;
    }

    // Check is_product_live
    if (pitch.is_product_live) {
      qualityScore += 10;
    } else {
      flags.push('product_not_live');
      autoApprove = false;
    }

    // Check completeness
    const requiredFields = ['startup_name', 'one_liner', 'product_url', 'product_stage', 'category', 'what_problem_do_you_solve'];
    const completedFields = requiredFields.filter(field => pitch[field] && pitch[field].toString().trim().length > 0);
    qualityScore += Math.floor((completedFields.length / requiredFields.length) * 20);

    // Check problem description length
    if (pitch.what_problem_do_you_solve && pitch.what_problem_do_you_solve.length >= 50) {
      qualityScore += 10;
    } else {
      flags.push('problem_description_too_short');
    }

    // Check if category selected
    if (pitch.category && pitch.category !== 'Other') {
      qualityScore += 10;
    }

    // B. AI Content Review
    const textToReview = `
      Startup: ${pitch.startup_name}
      One-liner: ${pitch.one_liner}
      Problem: ${pitch.what_problem_do_you_solve || ''}
    `;

    const scamKeywords = ['guaranteed', 'get rich', 'mlm', 'passive income', 'crypto gains', '100x returns', 'guaranteed returns'];
    const spamKeywords = ['best app ever', 'revolutionary platform', 'change the world'];
    const nonStartupKeywords = ['agency', 'freelance', 'consulting', 'services', 'coaching'];

    const lowerText = textToReview.toLowerCase();

    // Check for scam indicators
    if (scamKeywords.some(keyword => lowerText.includes(keyword))) {
      flags.push('scam_indicators');
      qualityScore -= 30;
      autoApprove = false;
    }

    // Check for spam patterns
    if (spamKeywords.some(keyword => lowerText.includes(keyword))) {
      flags.push('vague_description');
      qualityScore -= 10;
    }

    // Check for non-startup indicators
    if (nonStartupKeywords.some(keyword => lowerText.includes(keyword))) {
      flags.push('not_a_startup_product');
      autoApprove = false;
    }

    // Check for all caps
    const words = textToReview.split(' ');
    const capsWords = words.filter(word => word.length > 3 && word === word.toUpperCase());
    if (capsWords.length > words.length * 0.3) {
      flags.push('excessive_caps');
      qualityScore -= 10;
    }

    // Use AI for deeper analysis
    try {
      const aiReview = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Review this startup pitch submission and identify any red flags:

Startup Name: ${pitch.startup_name}
One-liner: ${pitch.one_liner}
Problem Description: ${pitch.what_problem_do_you_solve || 'Not provided'}
Category: ${pitch.category || 'Not provided'}

Check for:
1. Scam/fraud indicators
2. Offensive or inappropriate content
3. Spam patterns
4. Vague or meaningless descriptions
5. Unrealistic claims without substance

Respond with JSON indicating if the submission should be flagged.`,
        response_json_schema: {
          type: 'object',
          properties: {
            has_red_flags: { type: 'boolean' },
            concerns: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string', enum: ['approve', 'review', 'reject'] }
          }
        }
      });

      if (aiReview.has_red_flags) {
        flags.push(...aiReview.concerns);
        if (aiReview.recommendation === 'reject') {
          autoApprove = false;
          qualityScore -= 20;
        }
      } else {
        qualityScore += 30; // No AI-detected issues
      }
    } catch (error) {
      console.error('AI review failed:', error);
      // Continue without AI review
      qualityScore += 15; // Give partial credit
    }

    // Ensure score is within bounds
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Determine review status
    let reviewStatus = 'pending';
    let isPublished = false;
    let rejectionReason = null;

    if (qualityScore >= 70 && autoApprove && flags.length === 0) {
      reviewStatus = 'approved';
      isPublished = true;
    } else if (qualityScore < 40 || !autoApprove) {
      reviewStatus = 'rejected';
      
      // Generate rejection reason
      if (flags.includes('product_not_live')) {
        rejectionReason = 'No live product - please submit once you have an MVP';
      } else if (flags.includes('invalid_product_url') || flags.includes('product_url_not_accessible')) {
        rejectionReason = 'Product URL does not work or is not accessible';
      } else if (flags.includes('scam_indicators')) {
        rejectionReason = 'Content violates our guidelines';
      } else if (flags.includes('not_a_startup_product')) {
        rejectionReason = 'Not a startup product';
      } else if (flags.includes('problem_description_too_short')) {
        rejectionReason = 'Description is unclear - please explain what your product does';
      } else {
        rejectionReason = 'Submission does not meet quality standards. Please review and resubmit.';
      }
    }

    // Update pitch
    await base44.asServiceRole.entities.Pitch.update(pitchId, {
      review_status: reviewStatus,
      quality_score: qualityScore,
      flags: flags,
      rejection_reason: rejectionReason,
      reviewed_at: new Date().toISOString(),
      is_published: isPublished,
      review_notes: `Auto-review completed. Score: ${qualityScore}/100. Flags: ${flags.join(', ') || 'None'}`
    });

    return Response.json({
      success: true,
      review_status: reviewStatus,
      quality_score: qualityScore,
      flags: flags,
      is_published: isPublished,
      rejection_reason: rejectionReason
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});