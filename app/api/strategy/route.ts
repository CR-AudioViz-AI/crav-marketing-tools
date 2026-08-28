import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - STRATEGY GENERATION API
// POST /api/strategy - Generate AI marketing strategy
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateStrategy, validateStrategyRequest, estimateStrategyCredits } from '@/lib/ai-strategy';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate request
    const errors = validateStrategyRequest(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Check user authentication (optional for free tier)
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userTier = 'starter';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        
        // Get user subscription tier
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();
        
        userTier = profile?.subscription_tier || 'starter';
      }
    }

    // Check rate limits for free tier
    if (userTier === 'starter') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from('marketing_strategies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId || 'anonymous')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if ((count || 0) >= 3) {
        return NextResponse.json(
          {
            success: false,
            error: 'Free tier limit reached (3 strategies/month). Upgrade to Pro for unlimited.',
            upgradeUrl: '/pricing',
          },
          { status: 429 }
        );
      }
    }

    // Generate strategy
    const { strategy, provider } = await generateStrategy(body);

    // Calculate credits used
    const creditsUsed = estimateStrategyCredits(body);

    // Save to database
    if (userId) {
      await supabase.from('marketing_strategies').insert({
        user_id: userId,
        strategy_id: strategy.id,
        business_name: body.businessName,
        industry: body.industry,
        goal: body.goal,
        budget: body.budget,
        strategy_data: strategy,
        ai_provider: provider,
        credits_used: creditsUsed,
      });

      // Update user credits
      await supabase.rpc('decrement_credits', {
        user_id: userId,
        amount: creditsUsed,
      });
    }

    // Log usage for analytics
    await supabase.from('api_usage_logs').insert({
      endpoint: '/api/strategy',
      method: 'POST',
      user_id: userId,
      user_tier: userTier,
      ai_provider: provider,
      response_time_ms: Date.now() - startTime,
      success: true,
    });

    return NextResponse.json({
      success: true,
      strategy,
      meta: {
        provider,
        creditsUsed,
        generatedAt: strategy.generatedAt,
        responseTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Strategy generation error:', error);

    // Log error
    await supabase.from('api_usage_logs').insert({
      endpoint: '/api/strategy',
      method: 'POST',
      response_time_ms: Date.now() - startTime,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate strategy. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Marketing Strategy Generator',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      POST: {
        description: 'Generate AI marketing strategy',
        body: {
          businessName: 'string (required)',
          industry: 'string (required)',
          goal: 'string (required)',
          budget: 'number (required)',
          targetArea: 'national | state | zip',
          targetLocation: 'string (optional)',
          platforms: 'string[] (required)',
          description: 'string (optional)',
          competitors: 'string[] (optional)',
        },
      },
    },
    freeTier: {
      limit: '3 strategies/month',
      features: ['Basic AI strategy', 'Platform recommendations', 'javari tool suggestions'],
    },
  });
}
