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



interface PlanConfig {
  plan_name: string;
  max_platforms: number;
  max_posts_per_month: number;
  max_team_members: number;
  max_ai_generations: number;
  max_campaigns: number;
  analytics_retention_days: number;
  features: Record<string, boolean>;
  trial_duration_days: number | null;
}

// GET - Get tenant info or list all for admin

/**
 * 2026-09-06: identity from the caller's token, never from the request.
 *
 * This route took a user id from the caller and used it against a client built
 * with secretKey() - the service-role credential - which bypasses row level
 * security entirely, so it acted on whichever account the caller named.
 */
async function __callerId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id as string;
  } catch {
    return null;
  }
}

function __unauthorised() {
  return NextResponse.json({ error: 'Sign in required.', code: 'AUTH_REQUIRED' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');
    const userId = await __callerId(request);
    if (!userId) return __unauthorised();

    if (tenantId) {
      // Get specific tenant
      const { data, error } = await supabase
        .from('js_tenants')
        .select(`
          *,
          team_members:js_team_members(count),
          connections:js_connections(count),
          posts:js_posts(count)
        `)
        .eq('id', tenantId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 404 });
      }

      // Check trial status
      const now = new Date();
      const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const trialExpired = trialEnds && trialEnds < now && data.plan === 'trial';

      return NextResponse.json({
        tenant: data,
        trialExpired,
        trialDaysRemaining: trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
      });
    }

    if (userId) {
      // Get tenants for user (owner or team member)
      const { data: ownedTenants } = await supabase
        .from('js_tenants')
        .select('*')
        .eq('owner_user_id', userId);

      const { data: memberTenants } = await supabase
        .from('js_team_members')
        .select('tenant:js_tenants(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      const tenants = [
        ...(ownedTenants || []),
        ...(memberTenants?.map(m => m.tenant) || []),
      ];

      return NextResponse.json({ tenants });
    }

    return NextResponse.json({ error: 'id or userId required' }, { status: 400 });

  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new tenant (start trial)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {name,  email} = body;
    const userId = await __callerId(request);
    if (!userId) return __unauthorised();

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'name and userId are required' },
        { status: 400 }
      );
    }

    // Get trial plan config
    const { data: planConfig } = await supabase
      .from('js_plan_configs')
      .select('*')
      .eq('plan_name', 'trial')
      .single();

    if (!planConfig) {
      return NextResponse.json({ error: 'Plan configuration not found' }, { status: 500 });
    }

    const config = planConfig as PlanConfig;
    const trialDays = config.trial_duration_days || 14;

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('js_tenants')
      .insert({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50),
        owner_user_id: userId,
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trialing',
        max_platforms: config.max_platforms,
        max_posts_per_month: config.max_posts_per_month,
        max_team_members: config.max_team_members,
        max_ai_generations: config.max_ai_generations,
        max_campaigns: config.max_campaigns,
        analytics_retention_days: config.analytics_retention_days,
        features: config.features,
      })
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    // Add owner as team member
    await supabase.from('js_team_members').insert({
      tenant_id: tenant.id,
      user_id: userId,
      email: email || '',
      role: 'owner',
      permissions: {
        create_posts: true,
        edit_posts: true,
        delete_posts: true,
        manage_connections: true,
        view_analytics: true,
        manage_team: true,
        manage_billing: true,
      },
      accepted_at: new Date().toISOString(),
    });

    // Initialize usage tracking
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await supabase.from('js_usage_tracking').insert({
      tenant_id: tenant.id,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      posts_limit: config.max_posts_per_month,
      ai_generations_limit: config.max_ai_generations,
    });

    // Create default brand profile
    await supabase.from('js_brand_profiles').insert({
      tenant_id: tenant.id,
      name: 'Default Brand',
      is_default: true,
      company_name: name,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        trialEndsAt: tenant.trial_ends_at,
      },
      message: `Welcome to Javari Social! Your 14-day trial starts now.`,
    });

  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update tenant (upgrade/downgrade)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, plan, subscriptionId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    // Get plan config
    const { data: planConfig } = await supabase
      .from('js_plan_configs')
      .select('*')
      .eq('plan_name', plan)
      .single();

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const config = planConfig as PlanConfig;

    // Get current tenant
    const { data: currentTenant } = await supabase
      .from('js_tenants')
      .select('plan, max_platforms, max_posts_per_month')
      .eq('id', tenantId)
      .single();

    const isDowngrade = currentTenant && (
      config.max_platforms < currentTenant.max_platforms ||
      config.max_posts_per_month < currentTenant.max_posts_per_month
    );

    // Update tenant
    const updateData: Record<string, unknown> = {
      plan,
      subscription_status: plan === 'trial' ? 'trialing' : 'active',
      max_platforms: config.max_platforms,
      max_posts_per_month: config.max_posts_per_month,
      max_team_members: config.max_team_members,
      max_ai_generations: config.max_ai_generations,
      max_campaigns: config.max_campaigns,
      analytics_retention_days: config.analytics_retention_days,
      features: config.features,
      plan_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (subscriptionId) {
      updateData.subscription_id = subscriptionId;
    }

    // Clear trial end if upgrading from trial
    if (plan !== 'trial') {
      updateData.trial_ends_at = null;
      updateData.paused_at = null;
    }

    const { data: tenant, error } = await supabase
      .from('js_tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // If downgrade, pause excess connections
    if (isDowngrade) {
      const { data: connections } = await supabase
        .from('js_connections')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('last_used_at', { ascending: true });

      if (connections && connections.length > config.max_platforms) {
        const toDeactivate = connections.slice(config.max_platforms);
        await supabase
          .from('js_connections')
          .update({ status: 'paused_downgrade' })
          .in('id', toDeactivate.map(c => c.id));
      }
    }

    return NextResponse.json({
      success: true,
      tenant,
      isDowngrade,
      message: isDowngrade 
        ? 'Plan downgraded. Some connections have been paused. Upgrade to reactivate.'
        : `Successfully upgraded to ${config.plan_name}!`,
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
