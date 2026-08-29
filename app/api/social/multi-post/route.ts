export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { selfOrigin } from '@/lib/social/egress';

interface PostTarget {
  platform: string;
  accountId?: string;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  identifier?: string;
  password?: string;
}

interface PostResult {
  platform: string;
  success: boolean;
  error?: string;
  postUrl?: string;
  messageId?: string;
}

// POST - Send to multiple platforms at once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      content, 
      targets,
      mediaUrls,
      linkUrl,
      hashtags,
      scheduledFor
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { error: 'At least one target platform is required' },
        { status: 400 }
      );
    }

    const results: PostResult[] = [];
    // NOT request.nextUrl.origin. That is built from the caller's Host
    // header, so `Host: attacker.example` would make this route POST the
    // webhook URLs and bot tokens in its own payload to the attacker.
    const baseUrl = selfOrigin();

    // Process each target
    for (const target of targets as PostTarget[]) {
      const result: PostResult = {
        platform: target.platform,
        success: false,
      };

      try {
        let response: Response;
        let postBody: Record<string, unknown>;

        switch (target.platform.toLowerCase()) {
          case 'discord':
            if (!target.webhookUrl) {
              result.error = 'Webhook URL required';
              break;
            }
            postBody = {
              webhookUrl: target.webhookUrl,
              content,
              mediaUrls,
            };
            response = await fetch(`${baseUrl}/api/social/discord`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postBody),
            });
            if (response.ok) {
              result.success = true;
            } else {
              const data = await response.json();
              result.error = data.error || 'Failed';
            }
            break;

          case 'slack':
            if (!target.webhookUrl) {
              result.error = 'Webhook URL required';
              break;
            }
            postBody = {
              webhookUrl: target.webhookUrl,
              content,
              mediaUrls,
              linkUrl,
            };
            response = await fetch(`${baseUrl}/api/social/slack`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postBody),
            });
            if (response.ok) {
              result.success = true;
            } else {
              const data = await response.json();
              result.error = data.error || 'Failed';
            }
            break;

          case 'telegram':
            if (!target.botToken || !target.chatId) {
              result.error = 'Bot token and chat ID required';
              break;
            }
            postBody = {
              botToken: target.botToken,
              chatId: target.chatId,
              content,
              mediaUrls,
              linkUrl,
            };
            response = await fetch(`${baseUrl}/api/social/telegram`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postBody),
            });
            if (response.ok) {
              result.success = true;
              const data = await response.json();
              result.messageId = data.results?.[0]?.messageId?.toString();
            } else {
              const data = await response.json();
              result.error = data.error || 'Failed';
            }
            break;

          case 'bluesky':
            if (!target.identifier || !target.password) {
              result.error = 'Identifier and password required';
              break;
            }
            // Truncate content for Bluesky's 300 char limit
            const bskyContent = content.length > 300 
              ? content.substring(0, 297) + '...' 
              : content;
            postBody = {
              identifier: target.identifier,
              password: target.password,
              content: bskyContent,
              linkUrl,
            };
            response = await fetch(`${baseUrl}/api/social/bluesky`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postBody),
            });
            if (response.ok) {
              result.success = true;
              const data = await response.json();
              result.postUrl = data.postUrl;
            } else {
              const data = await response.json();
              result.error = data.error || 'Failed';
            }
            break;

          default:
            result.error = `Platform ${target.platform} not yet supported for direct posting`;
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }

      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: successCount > 0,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in multi-post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
