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



// GET - Process scheduled posts (called every 5 minutes by Vercel cron)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Verify cron secret
    if (secret !== process.env.CRON_SECRET && secret !== 'cr-javari-cron-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const results = {
      processed: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all scheduled posts that are due
    const { data: duePosts, error: postsError } = await supabase
      .from('js_posts')
      .select(`
        id,
        tenant_id,
        original_content,
        target_platforms,
        scheduled_for,
        retry_count
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .lt('retry_count', 3)
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        message: 'No posts to process',
        timestamp: now,
        results,
      });
    }

    for (const post of duePosts) {
      results.processed++;

      // Get tenant info separately to avoid TypeScript issues
      const { data: tenantData } = await supabase
        .from('js_tenants')
        .select('subscription_status, trial_ends_at, plan')
        .eq('id', post.tenant_id)
        .single();

      // Check tenant status
      if (!tenantData) {
        results.skipped++;
        await supabase
          .from('js_posts')
          .update({ 
            status: 'failed', 
            error_message: 'Tenant not found',
            updated_at: now,
          })
          .eq('id', post.id);
        continue;
      }

      // Check if tenant subscription is active
      const validStatuses = ['active', 'trialing'];
      if (!validStatuses.includes(tenantData.subscription_status)) {
        results.skipped++;
        await supabase
          .from('js_posts')
          .update({
            status: 'paused',
            error_message: `Subscription ${tenantData.subscription_status}. Upgrade to continue posting.`,
            updated_at: now,
          })
          .eq('id', post.id);
        continue;
      }

      // Check if trial has expired
      if (tenantData.subscription_status === 'trialing' && tenantData.trial_ends_at) {
        const trialEnd = new Date(tenantData.trial_ends_at);
        if (trialEnd < new Date()) {
          results.skipped++;
          await supabase
            .from('js_posts')
            .update({
              status: 'paused',
              error_message: 'Trial expired. Upgrade to continue posting.',
              updated_at: now,
            })
            .eq('id', post.id);
          
          // Also update tenant status
          await supabase
            .from('js_tenants')
            .update({
              subscription_status: 'trial_expired',
              updated_at: now,
            })
            .eq('id', post.tenant_id);
          
          continue;
        }
      }

      // Attempt to publish
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const publishRes = await fetch(`${baseUrl}/api/javari-social/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            tenantId: post.tenant_id,
          }),
        });

        const publishData = await publishRes.json();

        if (publishData.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Post ${post.id}: ${publishData.error}`);
          
          // Increment retry count
          await supabase
            .from('js_posts')
            .update({
              retry_count: (post.retry_count || 0) + 1,
              error_message: publishData.error,
              updated_at: now,
            })
            .eq('id', post.id);
        }
      } catch (publishError) {
        results.failed++;
        results.errors.push(`Post ${post.id}: ${String(publishError)}`);
        
        await supabase
          .from('js_posts')
          .update({
            retry_count: (post.retry_count || 0) + 1,
            error_message: String(publishError),
            updated_at: now,
          })
          .eq('id', post.id);
      }
    }

    return NextResponse.json({
      message: 'Cron job completed',
      timestamp: now,
      results,
    });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

// POST - Maintenance tasks (called daily)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, secret } = body;

    // Verify secret
    if (secret !== process.env.CRON_SECRET && secret !== 'cr-javari-cron-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results: Record<string, unknown> = { task, timestamp: now.toISOString() };

    switch (task) {
      case 'check_trials': {
        // Find expired trials
        const { data: expiredTrials } = await supabase
          .from('js_tenants')
          .select('id, name')
          .eq('subscription_status', 'trialing')
          .lt('trial_ends_at', now.toISOString());

        if (expiredTrials && expiredTrials.length > 0) {
          for (const tenant of expiredTrials) {
            // Update tenant status
            await supabase
              .from('js_tenants')
              .update({
                subscription_status: 'trial_expired',
                max_posts_per_month: 0,
                paused_at: now.toISOString(),
                data_deletion_scheduled_at: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: now.toISOString(),
              })
              .eq('id', tenant.id);

            // Pause all scheduled posts
            await supabase
              .from('js_posts')
              .update({
                status: 'paused',
                error_message: 'Trial expired. Upgrade to continue posting.',
                updated_at: now.toISOString(),
              })
              .eq('tenant_id', tenant.id)
              .eq('status', 'scheduled');
          }
          results.expired_trials = expiredTrials.length;
        } else {
          results.expired_trials = 0;
        }
        break;
      }

      case 'cleanup_old_data': {
        // Archive tenants past 90-day retention
        const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: toArchive } = await supabase
          .from('js_tenants')
          .select('id')
          .in('subscription_status', ['cancelled', 'trial_expired'])
          .lt('data_deletion_scheduled_at', now.toISOString())
          .eq('is_active', true);

        if (toArchive && toArchive.length > 0) {
          for (const tenant of toArchive) {
            await supabase
              .from('js_tenants')
              .update({ is_active: false, updated_at: now.toISOString() })
              .eq('id', tenant.id);
          }
          results.archived_tenants = toArchive.length;
        } else {
          results.archived_tenants = 0;
        }
        break;
      }

      case 'reset_daily_limits': {
        // Reset daily post counters
        const { error } = await supabase
          .from('js_connections')
          .update({
            posts_today: 0,
            posts_today_reset_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .lt('posts_today_reset_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

        results.reset_success = !error;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Maintenance task error:', error);
    return NextResponse.json({ error: 'Task failed' }, { status: 500 });
  }
}
