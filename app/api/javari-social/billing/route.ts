import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Plan to Stripe price mapping (set these in Stripe dashboard)
const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  },
  agency: {
    monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || 'price_agency_monthly',
    yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || 'price_agency_yearly',
  },
};

// GET - Get billing info for tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    // Get tenant
    const { data: tenant, error } = await supabase
      .from('js_tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get plan config
    const { data: planConfig } = await supabase
      .from('js_plan_configs')
      .select('*')
      .eq('plan_name', tenant.plan)
      .single();

    // Get current usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const { data: usage } = await supabase
      .from('js_usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period_start', periodStart)
      .single();

    // Calculate trial status
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
    const isTrialing = tenant.plan === 'trial' && trialEndsAt && trialEndsAt > now;
    const trialExpired = tenant.plan === 'trial' && trialEndsAt && trialEndsAt <= now;
    const trialDaysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    // Get Stripe subscription if exists
    let stripeSubscription = null;
    if (tenant.subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(tenant.subscription_id);
      } catch {
        // Subscription might not exist
      }
    }

    // Get available plans for upgrade
    const { data: availablePlans } = await supabase
      .from('js_plan_configs')
      .select('*')
      .eq('is_active', true)
      .eq('is_trial', false)
      .order('sort_order');

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscription_status,
      },
      trial: {
        isTrialing,
        trialExpired,
        trialEndsAt: tenant.trial_ends_at,
        daysRemaining: trialDaysRemaining,
        message: trialExpired 
          ? 'Your trial has ended. Upgrade to continue using Javari Social!'
          : isTrialing 
            ? `${trialDaysRemaining} days left in your trial. Upgrade anytime to keep your data!`
            : null,
      },
      currentPlan: planConfig,
      usage: {
        posts: {
          used: usage?.posts_count || 0,
          limit: tenant.max_posts_per_month,
          remaining: tenant.max_posts_per_month - (usage?.posts_count || 0),
        },
        aiGenerations: {
          used: usage?.ai_generations_count || 0,
          limit: tenant.max_ai_generations,
          remaining: tenant.max_ai_generations - (usage?.ai_generations_count || 0),
        },
        platforms: {
          connected: usage?.platforms_connected || 0,
          limit: tenant.max_platforms,
        },
      },
      subscription: stripeSubscription ? {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      } : null,
      availablePlans: availablePlans?.map(p => ({
        ...p,
        isCurrent: p.plan_name === tenant.plan,
        isUpgrade: (p.sort_order || 0) > (planConfig?.sort_order || 0),
        isDowngrade: (p.sort_order || 0) < (planConfig?.sort_order || 0),
      })),
    });

  } catch (error) {
    console.error('Get billing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create checkout session for upgrade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, plan, billingCycle, successUrl, cancelUrl } = body;

    if (!tenantId || !plan) {
      return NextResponse.json({ error: 'tenantId and plan required' }, { status: 400 });
    }

    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get tenant
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('*, owner:profiles(email)')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const priceId = billingCycle === 'yearly' 
      ? PLAN_PRICES[plan].yearly 
      : PLAN_PRICES[plan].monthly;

    // Create or get Stripe customer
    let customerId = tenant.metadata?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.owner?.email,
        name: tenant.name,
        metadata: {
          tenant_id: tenantId,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('js_tenants')
        .update({ 
          metadata: { ...tenant.metadata, stripe_customer_id: customerId } 
        })
        .eq('id', tenantId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
          plan: plan,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Manage subscription (cancel, resume, change plan)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, action, newPlan } = body;

    if (!tenantId || !action) {
      return NextResponse.json({ error: 'tenantId and action required' }, { status: 400 });
    }

    // Get tenant
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (!tenant || !tenant.subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    switch (action) {
      case 'cancel': {
        // Cancel at period end (don't delete data immediately)
        await stripe.subscriptions.update(tenant.subscription_id, {
          cancel_at_period_end: true,
        });

        await supabase
          .from('js_tenants')
          .update({ subscription_status: 'canceling' })
          .eq('id', tenantId);

        return NextResponse.json({
          success: true,
          message: 'Subscription will cancel at the end of the billing period. Your data will be preserved for 90 days.',
        });
      }

      case 'resume': {
        // Resume cancelled subscription
        await stripe.subscriptions.update(tenant.subscription_id, {
          cancel_at_period_end: false,
        });

        await supabase
          .from('js_tenants')
          .update({ subscription_status: 'active' })
          .eq('id', tenantId);

        return NextResponse.json({
          success: true,
          message: 'Subscription resumed! You\'re all set.',
        });
      }

      case 'change_plan': {
        if (!newPlan || !PLAN_PRICES[newPlan]) {
          return NextResponse.json({ error: 'Invalid new plan' }, { status: 400 });
        }

        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(tenant.subscription_id);
        
        // Update subscription with new price
        await stripe.subscriptions.update(tenant.subscription_id, {
          items: [
            {
              id: subscription.items.data[0].id,
              price: PLAN_PRICES[newPlan].monthly,
            },
          ],
          proration_behavior: 'create_prorations',
        });

        // Get new plan config
        const { data: planConfig } = await supabase
          .from('js_plan_configs')
          .select('*')
          .eq('plan_name', newPlan)
          .single();

        if (planConfig) {
          await supabase
            .from('js_tenants')
            .update({
              plan: newPlan,
              max_platforms: planConfig.max_platforms,
              max_posts_per_month: planConfig.max_posts_per_month,
              max_team_members: planConfig.max_team_members,
              max_ai_generations: planConfig.max_ai_generations,
              max_campaigns: planConfig.max_campaigns,
              analytics_retention_days: planConfig.analytics_retention_days,
              features: planConfig.features,
            })
            .eq('id', tenantId);
        }

        return NextResponse.json({
          success: true,
          message: `Plan changed to ${newPlan}. Changes take effect immediately.`,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Manage subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
