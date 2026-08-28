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



// GET - Fetch scheduled posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('social_queue')
      .select('*')
      .eq('status', status)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
    }

    // Get unique post IDs and account IDs
    const postIds = [...new Set((queueItems || []).map((q: Record<string, unknown>) => q.post_id))];
    const accountIds = [...new Set((queueItems || []).map((q: Record<string, unknown>) => q.account_id))];

    // Fetch posts
    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .in('id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']);

    // Fetch accounts  
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('*')
      .in('id', accountIds.length > 0 ? accountIds : ['00000000-0000-0000-0000-000000000000']);

    // Fetch platforms
    const { data: platforms } = await supabase
      .from('social_platforms')
      .select('*');

    // Create lookup maps
    const postMap = new Map();
    for (const p of posts || []) {
      postMap.set(p.id, p);
    }

    const accountMap = new Map();
    for (const a of accounts || []) {
      accountMap.set(a.id, a);
    }

    const platformMap = new Map();
    for (const p of platforms || []) {
      platformMap.set(p.id, p);
    }

    // Group by post
    const groupedPosts = new Map<string, {
      id: string;
      content: string;
      scheduledFor: string;
      status: string;
      platforms: string[];
      accounts: Array<{ id: string; platform: string; username: string }>;
      media?: string[];
    }>();

    for (const item of queueItems || []) {
      const post = postMap.get(item.post_id);
      const account = accountMap.get(item.account_id);
      const platform = account ? platformMap.get(account.platform_id) : null;

      if (!post) continue;

      const postId = post.id as string;
      if (!groupedPosts.has(postId)) {
        groupedPosts.set(postId, {
          id: postId,
          content: post.content || '',
          scheduledFor: item.scheduled_for as string,
          status: item.status as string,
          platforms: [],
          accounts: [],
          media: post.media_urls,
        });
      }

      const group = groupedPosts.get(postId)!;
      const platformName = platform?.name || 'unknown';
      if (!group.platforms.includes(platformName)) {
        group.platforms.push(platformName);
      }
      group.accounts.push({
        id: account?.id || '',
        platform: platformName,
        username: account?.username || '',
      });
    }

    return NextResponse.json({
      posts: Array.from(groupedPosts.values()),
    });

  } catch (error) {
    console.error('Error in GET /api/social/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Schedule a new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, accountIds, scheduledFor, linkUrl, hashtags, mediaUrls } = body;

    if (!content || !accountIds || accountIds.length === 0 || !scheduledFor) {
      return NextResponse.json(
        { error: 'Content, accounts, and scheduled time are required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Create the post record
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .insert({
        content,
        link_url: linkUrl,
        hashtags: hashtags || [],
        media_urls: mediaUrls || [],
        scheduled_for: scheduledFor,
        status: 'scheduled',
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    // Create queue entries for each account
    const queueEntries = accountIds.map((accountId: string) => ({
      post_id: post.id,
      account_id: accountId,
      scheduled_for: scheduledFor,
      status: 'pending',
    }));

    const { error: queueError } = await supabase
      .from('social_queue')
      .insert(queueEntries);

    if (queueError) {
      console.error('Error creating queue entries:', queueError);
      await supabase.from('social_posts').delete().eq('id', post.id);
      return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      scheduledFor,
      accountCount: accountIds.length,
    });

  } catch (error) {
    console.error('Error in POST /api/social/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a scheduled post
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, content, scheduledFor, linkUrl, hashtags } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (content) updates.content = content;
    if (scheduledFor) updates.scheduled_for = scheduledFor;
    if (linkUrl !== undefined) updates.link_url = linkUrl;
    if (hashtags) updates.hashtags = hashtags;

    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (postError) {
      console.error('Error updating post:', postError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    if (scheduledFor) {
      await supabase
        .from('social_queue')
        .update({ scheduled_for: scheduledFor })
        .eq('post_id', postId)
        .eq('status', 'pending');
    }

    return NextResponse.json({ success: true, post });

  } catch (error) {
    console.error('Error in PATCH /api/social/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await supabase.from('social_queue').delete().eq('post_id', postId);
    
    const { error: postError } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId);

    if (postError) {
      console.error('Error deleting post:', postError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/social/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
