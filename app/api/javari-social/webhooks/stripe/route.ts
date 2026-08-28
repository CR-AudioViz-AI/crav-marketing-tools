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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventType = event.type;
    const eventData = event.data.object;

    console.log(`Stripe webhook received: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = eventData as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenant_id;
        const plan = session.metadata?.plan;

        if (tenantId && session.subscription) {
          // Get plan config
          const { data: planConfig } = await supabase
            .from('js_plan_configs')
            .select('*')
            .eq('plan_name', plan)
            .single();

          if (planConfig) {
            // Update tenant with new subscription
            await supabase
              .from('js_tenants')
              .update({
                plan,
                subscription_id: session.subscription as string,
                subscription_status: 'active',
                trial_ends_at: null,
                paused_at: null,
                max_platforms: planConfig.max_platforms,
                max_posts_per_month: planConfig.max_posts_per_month,
                max_team_members: planConfig.max_team_members,
                max_ai_generations: planConfig.max_ai_generations,
                max_campaigns: planConfig.max_campaigns,
                analytics_retention_days: planConfig.analytics_retention_days,
                features: planConfig.features,
                plan_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', tenantId);

            console.log(`Tenant ${tenantId} upgraded to ${plan}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = eventData as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id;

        if (tenantId) {
          let status = 'active';
          
          if (subscription.cancel_at_period_end) {
            status = 'canceling';
          } else if (subscription.status === 'past_due') {
            status = 'past_due';
          } else if (subscription.status === 'unpaid') {
            status = 'unpaid';
          }

          await supabase
            .from('js_tenants')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = eventData as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id;

        if (tenantId) {
          // Downgrade to expired state
          // Don't delete data - pause and schedule deletion
          await supabase
            .from('js_tenants')
            .update({
              plan: 'expired',
              subscription_status: 'canceled',
              subscription_id: null,
              paused_at: new Date().toISOString(),
              data_deletion_scheduled_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
              max_platforms: 0,
              max_posts_per_month: 0,
              max_ai_generations: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantId);

          // Pause all connections
          await supabase
            .from('js_connections')
            .update({ status: 'paused_subscription' })
            .eq('tenant_id', tenantId)
            .eq('status', 'active');

          console.log(`Tenant ${tenantId} subscription canceled - data preserved for 90 days`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = eventData as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        // Find tenant by subscription
        const { data: tenant } = await supabase
          .from('js_tenants')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .single();

        if (tenant) {
          await supabase
            .from('js_tenants')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenant.id);

          console.log(`Payment failed for tenant ${tenant.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = eventData as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        // Find tenant by subscription
        const { data: tenant } = await supabase
          .from('js_tenants')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .single();

        if (tenant) {
          await supabase
            .from('js_tenants')
            .update({
              subscription_status: 'active',
              paused_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenant.id);

          // Reactivate connections if they were paused
          await supabase
            .from('js_connections')
            .update({ status: 'active' })
            .eq('tenant_id', tenant.id)
            .eq('status', 'paused_subscription');

          console.log(`Payment succeeded for tenant ${tenant.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
