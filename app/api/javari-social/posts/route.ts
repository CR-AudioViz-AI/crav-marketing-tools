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



interface Platform {
  name: string;
  display_name: string;
  character_limit: number | null;
  media_required: boolean;
  max_hashtags: number | null;
  content_rules: Record<string, boolean | string>;
  limit_explanation: string;
}

interface BrandProfile {
  id?: string;
  hashtags_primary: string[];
  cta_templates: string[];
  footer_template: string;
}

// Check usage limits
async function checkPostLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number; message?: string }> {
  const { data: tenant } = await supabase
    .from('js_tenants')
    .select('max_posts_per_month, subscription_status, trial_ends_at')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    return { allowed: false, current: 0, max: 0, message: 'Tenant not found' };
  }

  // Check trial expiry
  if (tenant.subscription_status === 'trialing' && tenant.trial_ends_at) {
    if (new Date(tenant.trial_ends_at) < new Date()) {
      return { allowed: false, current: 0, max: tenant.max_posts_per_month, message: 'Trial expired. Upgrade to continue posting.' };
    }
  }

  // Check subscription status
  if (['canceled', 'paused'].includes(tenant.subscription_status)) {
    return { allowed: false, current: 0, max: tenant.max_posts_per_month, message: 'Subscription inactive. Please reactivate.' };
  }

  // Get current month usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { data: usage } = await supabase
    .from('js_usage_tracking')
    .select('posts_count')
    .eq('tenant_id', tenantId)
    .eq('period_start', periodStart)
    .single();

  const currentCount = usage?.posts_count || 0;
  const allowed = currentCount < tenant.max_posts_per_month;

  return {
    allowed,
    current: currentCount,
    max: tenant.max_posts_per_month,
    message: allowed ? undefined : `Monthly post limit reached (${currentCount}/${tenant.max_posts_per_month}). Upgrade for more.`,
  };
}

// Adapt content for specific platform
function adaptContent(
  content: string,
  platform: Platform,
  brand: BrandProfile | null,
  options: { includeHashtags?: boolean; includeCta?: boolean }
): { content: string; warnings: string[]; truncated: boolean } {
  const warnings: string[] = [];
  let finalContent = content;
  let truncated = false;

  // Add brand hashtags
  if (options.includeHashtags && brand?.hashtags_primary?.length) {
    const maxTags = platform.max_hashtags || 10;
    const tags = brand.hashtags_primary.slice(0, maxTags);
    
    // For Instagram, note that hashtags should go in first comment
    if (platform.name === 'instagram') {
      warnings.push('Tip: Instagram hashtags perform best in the first comment. We\'ll add them there.');
    } else {
      finalContent += '\n\n' + tags.join(' ');
    }
  }

  // Add CTA
  if (options.includeCta && brand?.cta_templates?.length) {
    finalContent += '\n\n' + brand.cta_templates[0];
  }

  // Apply character limit
  if (platform.character_limit && finalContent.length > platform.character_limit) {
    const limit = platform.character_limit;
    finalContent = finalContent.substring(0, limit - 3) + '...';
    truncated = true;
    warnings.push(`Truncated to ${limit} characters (${platform.display_name} limit). ${platform.limit_explanation}`);
  }

  // Platform-specific warnings
  if (platform.media_required) {
    warnings.push(`${platform.display_name} requires an image or video with every post.`);
  }

  if (platform.content_rules?.professional_tone) {
    warnings.push('LinkedIn: Keep tone professional. Avoid excessive emojis.');
  }

  if (platform.content_rules?.vertical_video_only) {
    warnings.push('TikTok: Videos must be vertical (9:16 ratio).');
  }

  return { content: finalContent, warnings, truncated };
}

// GET - List posts for tenant
export async function GET(request: NextRequest) {
  const supabase = getSupabase()!
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    let query = supabase
      .from('js_posts')
      .select(`
        *,
        campaign:js_campaigns(id, name),
        brand:js_brand_profiles(id, name, company_name),
        results:js_post_results(
          id, platform, status, platform_url, 
          likes_count, comments_count, shares_count, posted_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Get usage stats
    const limits = await checkPostLimit(tenantId);

    return NextResponse.json({
      posts,
      usage: {
        current: limits.current,
        max: limits.max,
        remaining: limits.max - limits.current,
      },
    });

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  const supabase = getSupabase()!
  try {
    const body = await request.json();
    const {
      tenantId,
      content,
      targetPlatforms,
      mediaUrls,
      linkUrl,
      hashtags,
      autoHashtags,
      scheduledFor,
      useBestTime,
      campaignId,
      brandId,
    } = body;

    if (!tenantId || !content || !targetPlatforms?.length) {
      return NextResponse.json(
        { error: 'tenantId, content, and targetPlatforms are required' },
        { status: 400 }
      );
    }

    // Check limits
    const limits = await checkPostLimit(tenantId);
    if (!limits.allowed) {
      return NextResponse.json(
        { error: limits.message, usage: limits },
        { status: 403 }
      );
    }

    // Get platforms info
    const { data: platforms } = await supabase
      .from('js_platforms')
      .select('*')
      .in('name', targetPlatforms);

    if (!platforms?.length) {
      return NextResponse.json({ error: 'No valid platforms found' }, { status: 400 });
    }

    // Get brand if specified
    let brand: BrandProfile | null = null;
    if (brandId) {
      const { data: brandData } = await supabase
        .from('js_brand_profiles')
        .select('*')
        .eq('id', brandId)
        .single();
      brand = brandData;
    } else {
      // Get default brand
      const { data: defaultBrand } = await supabase
        .from('js_brand_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .single();
      brand = defaultBrand;
    }

    // Generate platform-specific content
    const platformContent: Record<string, { content: string; warnings: string[]; truncated: boolean }> = {};
    const allWarnings: string[] = [];
    const mediaIssues: string[] = [];

    for (const platform of platforms as Platform[]) {
      const adapted = adaptContent(content, platform, brand, {
        includeHashtags: autoHashtags !== false,
        includeCta: false,
      });
      platformContent[platform.name] = adapted;
      allWarnings.push(...adapted.warnings);

      // Check media requirements
      if (platform.media_required && (!mediaUrls || mediaUrls.length === 0)) {
        mediaIssues.push(`${platform.display_name} requires media but none provided`);
      }
    }

    // Create post
    const { data: post, error } = await supabase
      .from('js_posts')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        brand_id: brandId || brand?.id,
        original_content: content,
        media_urls: mediaUrls || [],
        link_url: linkUrl,
        hashtags: hashtags || [],
        auto_hashtags: autoHashtags !== false,
        target_platforms: targetPlatforms,
        platform_content: platformContent,
        scheduled_for: scheduledFor,
        use_best_time: useBestTime || false,
        status: scheduledFor ? 'scheduled' : 'draft',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Update usage tracking
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      await supabase.rpc('increment_usage', { 
        p_tenant_id: tenantId, 
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_field: 'posts_count' 
      });
    } catch {
      // Fallback if RPC doesn't exist - use upsert instead
      await supabase.from('js_usage_tracking')
        .upsert({
          tenant_id: tenantId,
          period_start: periodStart,
          period_end: periodEnd,
          posts_count: limits.current + 1,
          posts_limit: limits.max,
        }, { onConflict: 'tenant_id,period_start' });
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        status: post.status,
        targetPlatforms: post.target_platforms,
        scheduledFor: post.scheduled_for,
      },
      platformAdaptations: platformContent,
      warnings: [...new Set(allWarnings)], // Dedupe
      mediaIssues,
      usage: {
        current: limits.current + 1,
        max: limits.max,
        remaining: limits.max - limits.current - 1,
      },
    });

  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update post
export async function PATCH(request: NextRequest) {
  const supabase = getSupabase()!
  try {
    const body = await request.json();
    const { postId, tenantId, ...updates } = body;

    if (!postId || !tenantId) {
      return NextResponse.json({ error: 'postId and tenantId required' }, { status: 400 });
    }

    // Don't allow updating published posts
    const { data: existing } = await supabase
      .from('js_posts')
      .select('status')
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .single();

    if (existing?.status === 'published') {
      return NextResponse.json({ error: 'Cannot edit published posts' }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('js_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, post });

  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete post
export async function DELETE(request: NextRequest) {
  const supabase = getSupabase()!
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!postId || !tenantId) {
      return NextResponse.json({ error: 'id and tenantId required' }, { status: 400 });
    }

    // Check if published
    const { data: existing } = await supabase
      .from('js_posts')
      .select('status')
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .single();

    if (existing?.status === 'published') {
      return NextResponse.json({ 
        error: 'Cannot delete published posts. They remain for analytics.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('js_posts')
      .delete()
      .eq('id', postId)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Post deleted' });

  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
