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


// lazy supabase — see getSupabase() function

const ADMIN_KEY = process.env.SOCIAL_ADMIN_KEY || 'cr-social-admin-2025';

interface PlatformResult {
  platform: string;
  success: boolean;
  postUrl?: string;
  error?: string;
  characterCount?: number;
}

interface PostRequest {
  key: string;
  content: string;
  platforms: string[];
  mediaUrls?: string[];
  linkUrl?: string;
  includeHashtags?: boolean;
  includeCta?: boolean;
  scheduleFor?: string;
}

// Load credentials for a platform
async function getCredentials(platform: string) {
  const { data, error } = await supabase
    .from('admin_social_credentials')
    .select('credentials, credential_type')
    .eq('platform', platform.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

// Load platform rules
async function getPlatformRules(platform: string) {
  const { data } = await supabase
    .from('platform_rules')
    .select('*')
    .eq('platform', platform.toLowerCase())
    .single();
  return data;
}

// Load brand settings
async function getBrandSettings() {
  const { data } = await supabase
    .from('brand_settings')
    .select('setting_key, setting_value');
  
  if (!data) return {};
  
  const settings: Record<string, unknown> = {};
  for (const row of data) {
    settings[row.setting_key] = row.setting_value;
  }
  return settings;
}

// Apply branding to content
function applyBranding(
  content: string,
  platform: string,
  rules: { character_limit?: number; max_hashtags?: number } | null,
  brand: Record<string, unknown>,
  options: { includeHashtags?: boolean; includeCta?: boolean }
): string {
  let result = content;
  
  // Add hashtags
  if (options.includeHashtags && brand.hashtags_primary) {
    const hashtags = brand.hashtags_primary as string[];
    const maxTags = rules?.max_hashtags || 5;
    const selectedTags = hashtags.slice(0, maxTags).join(' ');
    result += '\n\n' + selectedTags;
  }
  
  // Add CTA
  if (options.includeCta && brand.cta_default) {
    result += '\n\n' + brand.cta_default;
  }
  
  // Truncate if needed
  const limit = rules?.character_limit;
  if (limit && result.length > limit) {
    result = result.substring(0, limit - 3) + '...';
  }
  
  return result;
}

// Post to Discord
async function postToDiscord(content: string, creds: { credentials: { webhook_url: string } }, mediaUrls?: string[]) {
  const payload: { content: string; embeds?: Array<{ image: { url: string } }> } = { content };
  
  if (mediaUrls?.length) {
    payload.embeds = mediaUrls.slice(0, 4).map(url => ({ image: { url } }));
  }
  
  const response = await fetch(creds.credentials.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  return { success: response.ok, error: response.ok ? undefined : 'Webhook failed' };
}

// Post to Slack
async function postToSlack(content: string, creds: { credentials: { webhook_url: string } }) {
  const response = await fetch(creds.credentials.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: content }),
  });
  
  return { success: response.ok, error: response.ok ? undefined : 'Webhook failed' };
}

// Post to Telegram
async function postToTelegram(content: string, creds: { credentials: { bot_token: string; chat_id: string } }) {
  const response = await fetch(
    `https://api.telegram.org/bot${creds.credentials.bot_token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: creds.credentials.chat_id,
        text: content,
        parse_mode: 'HTML',
      }),
    }
  );
  
  const data = await response.json();
  return { success: data.ok, error: data.ok ? undefined : data.description };
}

// Post to Bluesky
async function postToBluesky(content: string, creds: { credentials: { identifier: string; password: string } }) {
  // Login
  const loginRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: creds.credentials.identifier,
      password: creds.credentials.password,
    }),
  });
  
  if (!loginRes.ok) {
    return { success: false, error: 'Auth failed' };
  }
  
  const session = await loginRes.json();
  
  // Create post
  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: content.substring(0, 300),
        createdAt: new Date().toISOString(),
      },
    }),
  });
  
  const postData = await postRes.json();
  
  if (postRes.ok) {
    const postUrl = `https://bsky.app/profile/${session.handle}/post/${postData.uri.split('/').pop()}`;
    return { success: true, postUrl };
  }
  
  return { success: false, error: postData.message };
}

// Main POST handler - Auto-post to multiple platforms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PostRequest;
    const {
      key,
      content,
      platforms,
      mediaUrls,
      linkUrl,
      includeHashtags = true,
      includeCta = false,
      scheduleFor,
    } = body;

    // Auth check
    if (key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!content || !platforms?.length) {
      return NextResponse.json(
        { error: 'content and platforms are required' },
        { status: 400 }
      );
    }

    // If scheduled, save to queue and return
    if (scheduleFor) {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          content,
          target_platforms: platforms,
          media_urls: mediaUrls || [],
          link_url: linkUrl,
          scheduled_for: scheduleFor,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledFor: scheduleFor,
        postId: data.id,
        platforms,
      });
    }

    // Load brand settings
    const brand = await getBrandSettings();
    const results: PlatformResult[] = [];

    // Post to each platform
    for (const platform of platforms) {
      const creds = await getCredentials(platform);
      
      if (!creds) {
        results.push({
          platform,
          success: false,
          error: 'No credentials configured',
        });
        continue;
      }

      const rules = await getPlatformRules(platform);
      const brandedContent = applyBranding(content, platform, rules, brand, {
        includeHashtags,
        includeCta,
      });

      let result: { success: boolean; postUrl?: string; error?: string };

      try {
        switch (platform.toLowerCase()) {
          case 'discord':
            result = await postToDiscord(brandedContent, creds as { credentials: { webhook_url: string } }, mediaUrls);
            break;
          case 'slack':
            result = await postToSlack(brandedContent, creds as { credentials: { webhook_url: string } });
            break;
          case 'telegram':
            result = await postToTelegram(brandedContent, creds as { credentials: { bot_token: string; chat_id: string } });
            break;
          case 'bluesky':
            result = await postToBluesky(brandedContent, creds as { credentials: { identifier: string; password: string } });
            break;
          default:
            result = { success: false, error: `Platform ${platform} not yet implemented` };
        }
      } catch (err) {
        result = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }

      // Log to history
      await supabase.from('posting_history').insert({
        platform,
        content_sent: brandedContent,
        status: result.success ? 'success' : 'failed',
        platform_url: result.postUrl,
        error_message: result.error,
      });

      // Update rate limit tracking
      if (result.success) {
        await supabase
          .from('admin_social_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('platform', platform);
      }

      results.push({
        platform,
        success: result.success,
        postUrl: result.postUrl,
        error: result.error,
        characterCount: brandedContent.length,
      });
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Auto-post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get posting history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('posting_history')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  return NextResponse.json({
    history: data,
    count: data?.length || 0,
  });
}
