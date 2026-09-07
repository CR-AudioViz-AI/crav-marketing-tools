import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
import { selfOrigin } from '@/lib/social/egress';
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



// This endpoint is called by Vercel Cron or external scheduler
const CRON_SECRET = process.env.CRON_SECRET || 'cr-cron-2025';

interface ScheduledPost {
  id: string;
  content: string;
  target_platforms: string[];
  media_urls: string[];
  link_url: string | null;
  scheduled_for: string;
  retry_count: number;
  max_retries: number;
}

// GET - Process pending scheduled posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Verify cron secret
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Get pending posts that are due
  const { data: pendingPosts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .lt('retry_count', 3)
    .order('scheduled_for')
    .limit(10);

  if (error) {
    return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  if (!pendingPosts?.length) {
    return NextResponse.json({
      processed: 0,
      message: 'No pending posts to process',
    });
  }

  const results: Array<{
    postId: string;
    success: boolean;
    platforms: number;
    errors?: string[];
  }> = [];

  for (const post of pendingPosts as ScheduledPost[]) {
    // Mark as processing
    await supabase
      .from('scheduled_posts')
      .update({ status: 'processing' })
      .eq('id', post.id);

    try {
      // Call auto-post endpoint internally
      // See lib/social/egress.ts — the request's own origin is caller-controlled.
      const baseUrl = selfOrigin();
      const response = await fetch(`${baseUrl}/api/admin/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: process.env.SOCIAL_ADMIN_KEY || 'cr-social-admin-2025',
          content: post.content,
          platforms: post.target_platforms,
          mediaUrls: post.media_urls,
          linkUrl: post.link_url,
          includeHashtags: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Mark as completed
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'completed',
            results: result.results,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: true,
          platforms: result.summary.successful,
        });
      } else {
        // Increment retry count
        await supabase
          .from('scheduled_posts')
          .update({
            status: post.retry_count + 1 >= post.max_retries ? 'failed' : 'pending',
            retry_count: post.retry_count + 1,
            error_log: [...(post as unknown as { error_log: string[] }).error_log || [], {
              timestamp: new Date().toISOString(),
              error: result.error || 'Unknown error',
            }],
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: false,
          platforms: 0,
          errors: [result.error],
        });
      }
    } catch (err) {
      // Mark as failed if exception
      await supabase
        .from('scheduled_posts')
        .update({
          status: post.retry_count + 1 >= post.max_retries ? 'failed' : 'pending',
          retry_count: post.retry_count + 1,
          error_log: [...(post as unknown as { error_log: string[] }).error_log || [], {
            timestamp: new Date().toISOString(),
            error: err instanceof Error ? err.message : 'Exception',
          }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      results.push({
        postId: post.id,
        success: false,
        platforms: 0,
        errors: [err instanceof Error ? err.message : 'Exception'],
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    processed: results.length,
    successful: successCount,
    failed: results.length - successCount,
    results,
    timestamp: new Date().toISOString(),
  });
}

// POST - Create a new scheduled post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, content, platforms, mediaUrls, linkUrl, scheduledFor } = body;

    if (key !== (process.env.SOCIAL_ADMIN_KEY || 'cr-social-admin-2025')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!content || !platforms?.length || !scheduledFor) {
      return NextResponse.json(
        { error: 'content, platforms, and scheduledFor are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        content,
        target_platforms: platforms,
        media_urls: mediaUrls || [],
        link_url: linkUrl,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      post: {
        id: data.id,
        scheduledFor: data.scheduled_for,
        platforms: data.target_platforms,
        status: data.status,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const postId = searchParams.get('id');

  if (key !== (process.env.SOCIAL_ADMIN_KEY || 'cr-social-admin-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!postId) {
    return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', postId)
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Post cancelled',
  });
}
