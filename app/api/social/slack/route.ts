export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { assertSlackWebhook } from '@/lib/social/egress';

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  accessory?: {
    type: string;
    image_url?: string;
    alt_text?: string;
  };
  image_url?: string;
  alt_text?: string;
}

interface SlackPayload {
  text?: string;
  blocks?: SlackBlock[];
  username?: string;
  icon_url?: string;
  icon_emoji?: string;
}

// POST - Send message to Slack webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      webhookUrl, 
      content, 
      username,
      iconUrl,
      iconEmoji,
      mediaUrls,
      linkUrl,
      linkTitle
    } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Slack webhook URL is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Build Slack payload with blocks for rich formatting
    const blocks: SlackBlock[] = [];

    // Main text block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: content,
      },
    });

    // Add link button if provided
    if (linkUrl) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: linkTitle ? `<${linkUrl}|${linkTitle}>` : `<${linkUrl}|Learn More>`,
        },
      });
    }

    // Add images
    if (mediaUrls?.length > 0) {
      mediaUrls.slice(0, 3).forEach((url: string) => {
        blocks.push({
          type: 'image',
          image_url: url,
          alt_text: 'Shared image',
        });
      });
    }

    // Add footer
    blocks.push({
      type: 'context',
      text: {
        type: 'mrkdwn',
        text: '📱 Posted via CR AudioViz AI Social Command Center',
      },
    });

    const payload: SlackPayload = {
      text: content, // Fallback for notifications
      blocks,
      username: username || 'CR AudioViz AI',
      icon_url: iconUrl || 'https://craudiovizai.com/logo.png',
    };

    if (iconEmoji) {
      payload.icon_emoji = iconEmoji;
      delete payload.icon_url;
    }

    // Send to Slack
    await assertSlackWebhook(webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to send to Slack',
          details: errorText 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      platform: 'slack',
      message: 'Message sent to Slack successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in Slack webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
