export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { assertDiscordWebhook } from '@/lib/social/egress';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

// POST - Send message to Discord webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      webhookUrl, 
      content, 
      username,
      avatarUrl,
      embed,
      mediaUrls 
    } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Discord webhook URL is required' },
        { status: 400 }
      );
    }

    if (!content && !embed) {
      return NextResponse.json(
        { error: 'Content or embed is required' },
        { status: 400 }
      );
    }

    // Build webhook payload
    const payload: DiscordWebhookPayload = {
      username: username || 'CR AudioViz AI',
      avatar_url: avatarUrl || 'https://craudiovizai.com/logo.png',
    };

    if (content) {
      payload.content = content;
    }

    // Build embeds if provided
    if (embed || mediaUrls?.length > 0) {
      const embeds: DiscordEmbed[] = [];
      
      if (embed) {
        embeds.push({
          title: embed.title,
          description: embed.description,
          url: embed.url,
          color: embed.color || 0x6366f1, // Indigo
          footer: {
            text: 'Posted via CR AudioViz AI Social Command Center',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Add images as embeds
      if (mediaUrls?.length > 0) {
        mediaUrls.slice(0, 4).forEach((url: string, index: number) => {
          if (index === 0 && embeds.length > 0) {
            embeds[0].image = { url };
          } else {
            embeds.push({ image: { url } });
          }
        });
      }

      payload.embeds = embeds;
    }

    // Send to Discord
    await assertDiscordWebhook(webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to send to Discord',
          details: errorText 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      platform: 'discord',
      message: 'Message sent to Discord successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in Discord webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Validate webhook URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const webhookUrl = searchParams.get('url');

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Webhook URL required' },
      { status: 400 }
    );
  }

  // Validate it's a Discord webhook URL
  if (!webhookUrl.includes('discord.com/api/webhooks/')) {
    return NextResponse.json(
      { valid: false, error: 'Not a valid Discord webhook URL' },
      { status: 400 }
    );
  }

  try {
    // Test the webhook
    await assertDiscordWebhook(webhookUrl);
    const response = await fetch(webhookUrl, { method: 'GET' });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        valid: true,
        name: data.name,
        channelId: data.channel_id,
        guildId: data.guild_id,
        avatar: data.avatar,
      });
    } else {
      return NextResponse.json(
        { valid: false, error: 'Webhook not found or invalid' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Failed to validate webhook' },
      { status: 500 }
    );
  }
}
