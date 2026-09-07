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



// Check campaign limits
async function checkCampaignLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number; message?: string }> {
  const { data: tenant } = await supabase
    .from('js_tenants')
    .select('max_campaigns, subscription_status, trial_ends_at, plan')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    return { allowed: false, current: 0, max: 0, message: 'Tenant not found' };
  }

  // Check trial expiry
  if (tenant.plan === 'trial' && tenant.trial_ends_at) {
    if (new Date(tenant.trial_ends_at) < new Date()) {
      return { allowed: false, current: 0, max: tenant.max_campaigns, message: 'Trial expired. Upgrade to create campaigns.' };
    }
  }

  const { count } = await supabase
    .from('js_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'scheduled', 'active']);

  const currentCount = count || 0;
  const allowed = currentCount < tenant.max_campaigns;

  return {
    allowed,
    current: currentCount,
    max: tenant.max_campaigns,
    message: allowed ? undefined : `Campaign limit reached (${currentCount}/${tenant.max_campaigns}). Upgrade for more.`,
  };
}

// GET - List campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    let query = supabase
      .from('js_campaigns')
      .select(`
        *,
        brand:js_brand_profiles(id, name, company_name, logo_url),
        posts:js_posts(count)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const limits = await checkCampaignLimit(tenantId);

    return NextResponse.json({
      campaigns,
      limits: {
        current: limits.current,
        max: limits.max,
        canCreate: limits.allowed,
      },
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      name,
      description,
      goal,
      targetPlatforms,
      targetUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      startDate,
      endDate,
      postingFrequency,
      brandId,
    } = body;

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'tenantId and name required' }, { status: 400 });
    }

    // Check limits
    const limits = await checkCampaignLimit(tenantId);
    if (!limits.allowed) {
      return NextResponse.json(
        { error: limits.message, limits },
        { status: 403 }
      );
    }

    const { data: campaign, error } = await supabase
      .from('js_campaigns')
      .insert({
        tenant_id: tenantId,
        brand_id: brandId,
        name,
        description,
        goal,
        target_platforms: targetPlatforms || [],
        target_url: targetUrl,
        utm_source: utmSource || 'javari_social',
        utm_medium: utmMedium || 'social',
        utm_campaign: utmCampaign || name.toLowerCase().replace(/\s+/g, '_'),
        start_date: startDate,
        end_date: endDate,
        posting_frequency: postingFrequency,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign,
      limits: {
        current: limits.current + 1,
        max: limits.max,
        remaining: limits.max - limits.current - 1,
      },
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update campaign
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, tenantId, ...updates } = body;

    if (!campaignId || !tenantId) {
      return NextResponse.json({ error: 'campaignId and tenantId required' }, { status: 400 });
    }

    // Handle status changes
    if (updates.status) {
      const { data: current } = await supabase
        .from('js_campaigns')
        .select('status')
        .eq('id', campaignId)
        .eq('tenant_id', tenantId)
        .single();

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        draft: ['scheduled', 'active', 'cancelled'],
        scheduled: ['active', 'paused', 'cancelled'],
        active: ['paused', 'completed', 'cancelled'],
        paused: ['active', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      if (current && !validTransitions[current.status]?.includes(updates.status)) {
        return NextResponse.json(
          { error: `Cannot change status from ${current.status} to ${updates.status}` },
          { status: 400 }
        );
      }
    }

    const { data: campaign, error } = await supabase
      .from('js_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign });

  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete campaign (and associated posts)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!campaignId || !tenantId) {
      return NextResponse.json({ error: 'id and tenantId required' }, { status: 400 });
    }

    // Check if campaign has published posts
    const { count: publishedCount } = await supabase
      .from('js_posts')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'published');

    if (publishedCount && publishedCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete campaign with published posts. Archive it instead.' },
        { status: 400 }
      );
    }

    // Delete unpublished posts first
    await supabase
      .from('js_posts')
      .delete()
      .eq('campaign_id', campaignId)
      .neq('status', 'published');

    // Delete campaign
    const { error } = await supabase
      .from('js_campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Campaign deleted' });

  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
