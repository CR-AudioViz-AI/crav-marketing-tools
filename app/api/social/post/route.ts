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


// Initialize Supabase client

// Platform-specific posting functions
interface PostResult {
  platform: string;
  accountId: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

// Twitter/X posting via API
async function postToTwitter(
  content: string,
  accessToken: string,
  linkUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  try {
    const text = linkUrl ? `${content}\n\n${linkUrl}` : content;
    
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to post to Twitter' };
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.data.id,
      postUrl: `https://twitter.com/i/status/${data.data.id}`,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// LinkedIn posting via API
async function postToLinkedIn(
  content: string,
  accessToken: string,
  userId: string,
  linkUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  try {
    const postData: Record<string, unknown> = {
      author: `urn:li:person:${userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: linkUrl ? 'ARTICLE' : 'NONE',
          ...(linkUrl && {
            media: [{
              status: 'READY',
              originalUrl: linkUrl,
            }],
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to post to LinkedIn' };
    }

    const data = await response.json();
    const postId = data.id?.replace('urn:li:share:', '');
    return {
      success: true,
      postId,
      postUrl: postId ? `https://www.linkedin.com/feed/update/${data.id}` : undefined,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Discord webhook posting
async function postToDiscord(
  content: string,
  webhookUrl: string,
  linkUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = linkUrl ? `${content}\n\n${linkUrl}` : content;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        username: 'CR AudioViz AI',
        avatar_url: 'https://craudiovizai.com/logo.png',
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to post to Discord' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Telegram bot posting
async function postToTelegram(
  content: string,
  botToken: string,
  channelId: string,
  linkUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const text = linkUrl ? `${content}\n\n${linkUrl}` : content;
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.description || 'Failed to post to Telegram' };
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.result?.message_id?.toString(),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Mastodon posting (fully free, open API)
async function postToMastodon(
  content: string,
  accessToken: string,
  instanceUrl: string,
  linkUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  try {
    const text = linkUrl ? `${content}\n\n${linkUrl}` : content;
    
    const response = await fetch(`${instanceUrl}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: text }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to post to Mastodon' };
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.id,
      postUrl: data.url,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Bluesky posting (free, open API)
async function postToBluesky(
  content: string,
  handle: string,
  appPassword: string,
  linkUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  try {
    // First, create a session
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (!sessionRes.ok) {
      return { success: false, error: 'Failed to authenticate with Bluesky' };
    }

    const session = await sessionRes.json();
    const text = linkUrl ? `${content}\n\n${linkUrl}` : content;

    // Create the post
    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: {
          text,
          createdAt: new Date().toISOString(),
        },
      }),
    });

    if (!postRes.ok) {
      return { success: false, error: 'Failed to post to Bluesky' };
    }

    const postData = await postRes.json();
    return {
      success: true,
      postId: postData.uri,
      postUrl: `https://bsky.app/profile/${handle}/post/${postData.uri.split('/').pop()}`,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Slack webhook posting
async function postToSlack(
  content: string,
  webhookUrl: string,
  linkUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = linkUrl ? `${content}\n\n<${linkUrl}|Read more>` : content;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        username: 'CR AudioViz AI',
        icon_emoji: ':robot_face:',
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to post to Slack' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Main POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, accountIds, linkUrl, hashtags, mediaUrls } = body;

    if (!content || !accountIds || accountIds.length === 0) {
      return NextResponse.json(
        { error: 'Content and at least one account are required' },
        { status: 400 }
      );
    }

    // Fetch account details
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select(`
        *,
        platform:social_platforms(name, api_type)
      `)
      .in('id', accountIds)
      .eq('is_active', true);

    if (accountsError || !accounts) {
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
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
        status: 'publishing',
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json(
        { error: 'Failed to create post record' },
        { status: 500 }
      );
    }

    // Post to each platform
    const results: PostResult[] = [];

    for (const account of accounts) {
      const platformName = account.platform?.name;
      let result: PostResult = {
        platform: platformName,
        accountId: account.id,
        success: false,
        error: 'Platform not supported',
      };

      try {
        switch (platformName) {
          case 'twitter':
            const twitterResult = await postToTwitter(content, account.access_token, linkUrl);
            result = { ...result, ...twitterResult };
            break;

          case 'linkedin':
            const linkedinResult = await postToLinkedIn(
              content,
              account.access_token,
              account.platform_user_id,
              linkUrl
            );
            result = { ...result, ...linkedinResult };
            break;

          case 'discord':
            if (account.webhook_secret) {
              const discordResult = await postToDiscord(content, account.webhook_secret, linkUrl);
              result = { ...result, ...discordResult };
            }
            break;

          case 'telegram':
            if (account.bot_token && account.channel_id) {
              const telegramResult = await postToTelegram(
                content,
                account.bot_token,
                account.channel_id,
                linkUrl
              );
              result = { ...result, ...telegramResult };
            }
            break;

          case 'mastodon':
            if (account.metadata?.instance_url) {
              const mastodonResult = await postToMastodon(
                content,
                account.access_token,
                account.metadata.instance_url,
                linkUrl
              );
              result = { ...result, ...mastodonResult };
            }
            break;

          case 'bluesky':
            if (account.username && account.metadata?.app_password) {
              const blueskyResult = await postToBluesky(
                content,
                account.username,
                account.metadata.app_password,
                linkUrl
              );
              result = { ...result, ...blueskyResult };
            }
            break;

          case 'slack':
            if (account.webhook_secret) {
              const slackResult = await postToSlack(content, account.webhook_secret, linkUrl);
              result = { ...result, ...slackResult };
            }
            break;

          default:
            // For platforms without direct API (Facebook, Instagram, TikTok, etc.)
            // We mark as pending and can implement later
            result = {
              ...result,
              success: false,
              error: `${platformName} posting requires manual action or additional setup`,
            };
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }

      results.push(result);

      // Record the result
      await supabase.from('social_post_results').insert({
        post_id: post.id,
        account_id: account.id,
        status: result.success ? 'published' : 'failed',
        platform_post_id: result.postId,
        platform_url: result.postUrl,
        error_message: result.error,
        published_at: result.success ? new Date().toISOString() : null,
      });
    }

    // Update post status
    const allSucceeded = results.every(r => r.success);
    const someSucceeded = results.some(r => r.success);

    await supabase
      .from('social_posts')
      .update({
        status: allSucceeded ? 'published' : someSucceeded ? 'partial' : 'failed',
        published_at: someSucceeded ? new Date().toISOString() : null,
      })
      .eq('id', post.id);

    return NextResponse.json({
      success: someSucceeded,
      postId: post.id,
      results,
      message: allSucceeded
        ? 'Posted successfully to all platforms'
        : someSucceeded
        ? 'Posted to some platforms, check results for details'
        : 'Failed to post to any platform',
    });

  } catch (error) {
    console.error('Error in POST /api/social/post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('social_posts')
      .select(`
        *,
        results:social_post_results(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts });

  } catch (error) {
    console.error('Error in GET /api/social/post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
