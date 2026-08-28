import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkCredits, deductCredits, refundCredits } from '@/lib/credits';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'cr-javari-social-encryption-key!';

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

interface PublishResult {
  platform: string;
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

// Platform-specific publishers
async function publishToDiscord(content: string, credentials: { webhook_url: string }, mediaUrls?: string[]): Promise<PublishResult> {
  try {
    const payload: { content: string; embeds?: Array<{ image: { url: string } }> } = { content };
    if (mediaUrls?.length) {
      payload.embeds = mediaUrls.slice(0, 4).map(url => ({ image: { url } }));
    }
    
    const response = await fetch(credentials.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    return { 
      platform: 'discord', 
      success: response.ok, 
      error: response.ok ? undefined : 'Webhook failed' 
    };
  } catch (error) {
    return { platform: 'discord', success: false, error: String(error) };
  }
}

async function publishToSlack(content: string, credentials: { webhook_url: string }, mediaUrls?: string[]): Promise<PublishResult> {
  try {
    const blocks: Array<{ type: string; text?: { type: string; text: string }; image_url?: string; alt_text?: string }> = [
      { type: 'section', text: { type: 'mrkdwn', text: content } }
    ];
    
    if (mediaUrls?.length) {
      blocks.push({ type: 'image', image_url: mediaUrls[0], alt_text: 'Post image' });
    }
    
    const response = await fetch(credentials.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    
    return { 
      platform: 'slack', 
      success: response.ok, 
      error: response.ok ? undefined : 'Webhook failed' 
    };
  } catch (error) {
    return { platform: 'slack', success: false, error: String(error) };
  }
}

async function publishToTelegram(content: string, credentials: { bot_token: string; chat_id: string }, mediaUrls?: string[]): Promise<PublishResult> {
  try {
    const baseUrl = `https://api.telegram.org/bot${credentials.bot_token}`;
    
    if (mediaUrls?.length) {
      const response = await fetch(`${baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: credentials.chat_id,
          photo: mediaUrls[0],
          caption: content,
          parse_mode: 'HTML',
        }),
      });
      const data = await response.json();
      return { 
        platform: 'telegram', 
        success: data.ok, 
        platformPostId: data.result?.message_id?.toString(),
        error: data.ok ? undefined : data.description 
      };
    } else {
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: credentials.chat_id,
          text: content,
          parse_mode: 'HTML',
        }),
      });
      const data = await response.json();
      return { 
        platform: 'telegram', 
        success: data.ok, 
        platformPostId: data.result?.message_id?.toString(),
        error: data.ok ? undefined : data.description 
      };
    }
  } catch (error) {
    return { platform: 'telegram', success: false, error: String(error) };
  }
}

async function publishToBluesky(content: string, credentials: { identifier: string; app_password: string }, mediaUrls?: string[]): Promise<PublishResult> {
  try {
    // Create session
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.app_password,
      }),
    });
    
    if (!sessionRes.ok) {
      return { platform: 'bluesky', success: false, error: 'Authentication failed' };
    }
    
    const session = await sessionRes.json();
    
    // Create post
    const record: {
      $type: string;
      text: string;
      createdAt: string;
      embed?: { $type: string; images: Array<{ alt: string; image: { $type: string; ref: { $link: string }; mimeType: string; size: number } }> };
    } = {
      $type: 'app.bsky.feed.post',
      text: content.slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    
    // Handle image upload if present
    if (mediaUrls?.length) {
      const imageRes = await fetch(mediaUrls[0]);
      const imageBlob = await imageRes.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      
      const uploadRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
        method: 'POST',
        headers: {
          'Content-Type': imageBlob.type,
          'Authorization': `Bearer ${session.accessJwt}`,
        },
        body: imageBuffer,
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        record.embed = {
          $type: 'app.bsky.embed.images',
          images: [{
            alt: 'Post image',
            image: uploadData.blob,
          }],
        };
      }
    }
    
    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record,
      }),
    });
    
    const postData = await postRes.json();
    
    return { 
      platform: 'bluesky', 
      success: postRes.ok,
      platformPostId: postData.uri,
      platformUrl: postData.uri ? `https://bsky.app/profile/${session.handle}/post/${postData.uri.split('/').pop()}` : undefined,
      error: postRes.ok ? undefined : postData.message,
    };
  } catch (error) {
    return { platform: 'bluesky', success: false, error: String(error) };
  }
}

async function publishToMastodon(content: string, credentials: { instance_url: string; access_token: string }, mediaUrls?: string[]): Promise<PublishResult> {
  try {
    const baseUrl = credentials.instance_url.replace(/\/$/, '');
    let mediaIds: string[] = [];
    
    // Upload media if present
    if (mediaUrls?.length) {
      for (const url of mediaUrls.slice(0, 4)) {
        const imageRes = await fetch(url);
        const imageBlob = await imageRes.blob();
        
        const formData = new FormData();
        formData.append('file', imageBlob);
        
        const uploadRes = await fetch(`${baseUrl}/api/v2/media`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${credentials.access_token}` },
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaIds.push(uploadData.id);
        }
      }
    }
    
    // Create status
    const statusRes = await fetch(`${baseUrl}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: content.slice(0, 500),
        media_ids: mediaIds.length ? mediaIds : undefined,
      }),
    });
    
    const statusData = await statusRes.json();
    
    return {
      platform: 'mastodon',
      success: statusRes.ok,
      platformPostId: statusData.id,
      platformUrl: statusData.url,
      error: statusRes.ok ? undefined : statusData.error,
    };
  } catch (error) {
    return { platform: 'mastodon', success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  let transactionId: string | undefined;
  let userId: string | undefined;
  let isOwnerBypass = false;
  
  try {
    const body = await request.json();
    const { postId, tenantId } = body;

    if (!postId || !tenantId) {
      return NextResponse.json({ error: 'postId and tenantId required' }, { status: 400 });
    }

    // Get tenant to find user and check owner bypass
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('user_id, is_owner_bypass')
      .eq('id', tenantId)
      .single();
    
    userId = tenant?.user_id;
    isOwnerBypass = tenant?.is_owner_bypass === true;

    // Get post
    const { data: post, error: postError } = await supabase
      .from('js_posts')
      .select('*, brand:js_brand_profiles(*)')
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.status === 'published') {
      return NextResponse.json({ error: 'Post already published' }, { status: 400 });
    }

    // Determine credit cost based on platforms
    const platformCount = post.target_platforms?.length || 1;
    const creditAction = platformCount >= 3 ? 'social_post_multi' : 'social_post_basic';
    
    // Check and deduct credits if user exists (skip for owners)
    if (userId && !isOwnerBypass) {
      const creditCheck = await checkCredits(userId, creditAction);
      
      if (!creditCheck.sufficient) {
        return NextResponse.json({ 
          error: `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`,
          creditsRequired: creditCheck.required,
          creditsAvailable: creditCheck.balance,
        }, { status: 402 }); // 402 Payment Required
      }
      
      // Deduct credits upfront
      const deduction = await deductCredits(userId, creditAction, {
        postId,
        platforms: post.target_platforms,
        action: 'social_publish',
      });
      
      if (!deduction.success) {
        return NextResponse.json({ error: deduction.error }, { status: 400 });
      }
      
      transactionId = deduction.transactionId;
    }

    // Update status to publishing
    await supabase
      .from('js_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    // Get connections for target platforms
    const { data: connections } = await supabase
      .from('js_connections')
      .select(`
        *,
        platform:js_platforms(name, display_name, rate_limit_per_hour, rate_limit_per_day)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .in('platform_id', 
        await supabase
          .from('js_platforms')
          .select('id')
          .in('name', post.target_platforms)
          .then(r => r.data?.map(p => p.id) || [])
      );

    if (!connections?.length) {
      // Refund credits since no connections exist
      if (userId && !isOwnerBypass && transactionId) {
        const cost = creditAction === 'social_post_multi' ? 2 : 1;
        await refundCredits(userId, cost, 'No active connections for publishing', transactionId);
      }
      
      await supabase
        .from('js_posts')
        .update({ status: 'failed', last_error: 'No active connections for target platforms' })
        .eq('id', postId);
      
      return NextResponse.json({ 
        error: 'No active connections for target platforms',
        targetPlatforms: post.target_platforms,
        creditsRefunded: true,
      }, { status: 400 });
    }

    const results: PublishResult[] = [];

    // Publish to each platform
    for (const connection of connections) {
      const platformName = connection.platform?.name;
      
      // Get adapted content for this platform
      const adaptedContent = post.platform_content?.[platformName]?.content || post.original_content;
      
      // Decrypt credentials
      let credentials;
      try {
        credentials = JSON.parse(decrypt(connection.credentials_encrypted));
      } catch {
        results.push({ 
          platform: platformName, 
          success: false, 
          error: 'Failed to decrypt credentials' 
        });
        continue;
      }

      // Check rate limits
      if (connection.posts_today >= (connection.platform?.rate_limit_per_day || 1000)) {
        results.push({
          platform: platformName,
          success: false,
          error: `Daily rate limit reached for ${connection.platform?.display_name}. Try again tomorrow.`,
        });
        continue;
      }

      // Publish based on platform
      let result: PublishResult;
      
      switch (platformName) {
        case 'discord':
          result = await publishToDiscord(adaptedContent, credentials, post.media_urls);
          break;
        case 'slack':
          result = await publishToSlack(adaptedContent, credentials, post.media_urls);
          break;
        case 'telegram':
          result = await publishToTelegram(adaptedContent, credentials, post.media_urls);
          break;
        case 'bluesky':
          result = await publishToBluesky(adaptedContent, credentials, post.media_urls);
          break;
        case 'mastodon':
          result = await publishToMastodon(adaptedContent, credentials, post.media_urls);
          break;
        default:
          result = { platform: platformName, success: false, error: 'Platform not yet supported' };
      }

      results.push(result);

      // Update connection stats if successful
      if (result.success) {
        await supabase
          .from('js_connections')
          .update({ 
            posts_today: (connection.posts_today || 0) + 1,
            last_post_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
      }
    }

    // Determine overall status
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const allFailed = successCount === 0;
    const partialSuccess = successCount > 0 && successCount < totalCount;
    
    // If all failed, refund credits
    if (allFailed && userId && !isOwnerBypass && transactionId) {
      const cost = creditAction === 'social_post_multi' ? 2 : 1;
      await refundCredits(userId, cost, 'All publishing attempts failed', transactionId);
    }

    // Update post status
    const finalStatus = allFailed ? 'failed' : 'published';
    const publishResults = results.reduce((acc, r) => {
      acc[r.platform] = {
        success: r.success,
        platformPostId: r.platformPostId,
        platformUrl: r.platformUrl,
        error: r.error,
      };
      return acc;
    }, {} as Record<string, unknown>);

    await supabase
      .from('js_posts')
      .update({ 
        status: finalStatus,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
        publish_results: publishResults,
        last_error: allFailed ? results.map(r => `${r.platform}: ${r.error}`).join('; ') : null,
      })
      .eq('id', postId);

    return NextResponse.json({
      success: !allFailed,
      status: finalStatus,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
      },
      creditsCharged: !allFailed,
      creditsRefunded: allFailed,
    });

  } catch (error) {
    console.error('Publish error:', error);
    
    // Attempt to refund on unexpected errors (only if credits were charged)
    if (userId && transactionId) {
      await refundCredits(userId, 2, 'Unexpected error during publishing', transactionId);
    }
    
    return NextResponse.json({ 
      error: 'Publishing failed', 
      details: String(error),
      creditsRefunded: !!transactionId,
    }, { status: 500 });
  }
}
