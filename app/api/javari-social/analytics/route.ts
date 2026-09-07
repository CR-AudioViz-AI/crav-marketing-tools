import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



interface AnalyticsSummary {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  engagementRate: number;
  topPlatform: string | null;
  topPost: { id: string; content: string; engagement: number } | null;
  postsByPlatform: Record<string, number>;
  engagementByDay: Array<{ date: string; engagement: number }>;
}

// GET - Get analytics for tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const period = searchParams.get('period') || '30'; // days
    const platform = searchParams.get('platform');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    // Check tenant has access to analytics
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('analytics_retention_days, plan')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Limit period based on plan
    const maxDays = tenant.analytics_retention_days || 7;
    const requestedDays = parseInt(period);
    const actualDays = Math.min(requestedDays, maxDays);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - actualDays);

    // Get posts with results
    let query = supabase
      .from('js_posts')
      .select(`
        id,
        original_content,
        status,
        target_platforms,
        created_at,
        results:js_post_results(
          platform,
          status,
          likes_count,
          comments_count,
          shares_count,
          views_count,
          posted_at
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString());

    if (platform) {
      query = query.contains('target_platforms', [platform]);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Calculate analytics
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;
    const postsByPlatform: Record<string, number> = {};
    const engagementByPlatform: Record<string, number> = {};
    const engagementByDay: Record<string, number> = {};

    let topPost: { id: string; content: string; engagement: number } | null = null;

    for (const post of posts || []) {
      const results = post.results || [];
      let postEngagement = 0;

      for (const result of results) {
        totalLikes += result.likes_count || 0;
        totalComments += result.comments_count || 0;
        totalShares += result.shares_count || 0;
        totalViews += result.views_count || 0;

        const engagement = (result.likes_count || 0) + (result.comments_count || 0) * 2 + (result.shares_count || 0) * 3;
        postEngagement += engagement;

        // By platform
        if (!postsByPlatform[result.platform]) postsByPlatform[result.platform] = 0;
        postsByPlatform[result.platform]++;

        if (!engagementByPlatform[result.platform]) engagementByPlatform[result.platform] = 0;
        engagementByPlatform[result.platform] += engagement;

        // By day
        if (result.posted_at) {
          const day = result.posted_at.split('T')[0];
          if (!engagementByDay[day]) engagementByDay[day] = 0;
          engagementByDay[day] += engagement;
        }
      }

      // Track top post
      if (!topPost || postEngagement > topPost.engagement) {
        topPost = {
          id: post.id,
          content: post.original_content.substring(0, 100),
          engagement: postEngagement,
        };
      }
    }

    // Find top platform
    let topPlatform: string | null = null;
    let maxPlatformEngagement = 0;
    for (const [platform, engagement] of Object.entries(engagementByPlatform)) {
      if (engagement > maxPlatformEngagement) {
        maxPlatformEngagement = engagement;
        topPlatform = platform;
      }
    }

    // Calculate engagement rate
    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    // Format engagement by day
    const engagementByDayArray = Object.entries(engagementByDay)
      .map(([date, engagement]) => ({ date, engagement }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary: AnalyticsSummary = {
      totalPosts: posts?.length || 0,
      publishedPosts: posts?.filter(p => p.status === 'published').length || 0,
      scheduledPosts: posts?.filter(p => p.status === 'scheduled').length || 0,
      failedPosts: posts?.filter(p => p.status === 'failed').length || 0,
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      engagementRate: Math.round(engagementRate * 100) / 100,
      topPlatform,
      topPost,
      postsByPlatform,
      engagementByDay: engagementByDayArray,
    };

    return NextResponse.json({
      summary,
      period: {
        requested: requestedDays,
        actual: actualDays,
        limited: requestedDays > actualDays,
        upgradeMessage: requestedDays > actualDays 
          ? `Your plan allows ${maxDays} days of analytics. Upgrade for more history.`
          : null,
      },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Sync engagement data from platforms (called by cron)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, postResultId, engagement } = body;

    if (!postResultId || !engagement) {
      return NextResponse.json({ error: 'postResultId and engagement required' }, { status: 400 });
    }

    // Update engagement data
    const { error } = await supabase
      .from('js_post_results')
      .update({
        likes_count: engagement.likes || 0,
        comments_count: engagement.comments || 0,
        shares_count: engagement.shares || 0,
        views_count: engagement.views || 0,
        engagement_rate: engagement.rate || 0,
        last_engagement_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postResultId);

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Sync engagement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
