import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
import { telegramUrl } from '@/lib/social/egress';
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


// TELEGRAM_API is gone: the URL is built by telegramUrl(), which pins the host
// and encodes the token as a single path segment. A bare prefix constant is what
// let the token be concatenated into a path in the first place.

// POST - Send message via Telegram Bot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      botToken, 
      chatId, 
      content, 
      parseMode,
      mediaUrls,
      linkUrl,
      disablePreview
    } = body;

    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot token is required' },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Content or media is required' },
        { status: 400 }
      );
    }

    // Shape-checked and encoded. A token containing ../ would otherwise walk
    // to a different endpoint, and one containing ? or # would truncate the
    // path this code believes it is calling.
    const photoUrl = telegramUrl(botToken, 'sendPhoto');
    const messageUrl = telegramUrl(botToken, 'sendMessage');
    const results: Array<{ type: string; success: boolean; messageId?: number }> = [];

    // Format content with optional link
    let formattedContent = content || '';
    if (linkUrl && !formattedContent.includes(linkUrl)) {
      formattedContent += `\n\n🔗 ${linkUrl}`;
    }

    // Add footer
    formattedContent += '\n\n📱 via CR AudioViz AI';

    // Send photos first if provided
    if (mediaUrls?.length > 0) {
      for (const url of mediaUrls.slice(0, 10)) {
        const photoResponse = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: url,
            caption: results.length === 0 ? formattedContent : undefined,
            parse_mode: parseMode || 'HTML',
          }),
        });

        const photoData = await photoResponse.json();
        results.push({
          type: 'photo',
          success: photoData.ok,
          messageId: photoData.result?.message_id,
        });

        // Only add caption to first photo
        if (results.length === 1 && photoData.ok) {
          formattedContent = ''; // Clear so we don't send duplicate text
        }
      }
    }

    // Send text if we have content and didn't already send with photo
    if (formattedContent) {
      const textResponse = await fetch(messageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedContent,
          parse_mode: parseMode || 'HTML',
          disable_web_page_preview: disablePreview || false,
        }),
      });

      const textData = await textResponse.json();
      
      if (!textData.ok) {
        console.error('Telegram error:', textData);
        return NextResponse.json(
          { 
            error: 'Failed to send to Telegram',
            details: textData.description 
          },
          { status: 400 }
        );
      }

      results.push({
        type: 'message',
        success: true,
        messageId: textData.result?.message_id,
      });
    }

    return NextResponse.json({
      success: true,
      platform: 'telegram',
      message: 'Message sent to Telegram successfully',
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in Telegram API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get bot info and validate token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const botToken = searchParams.get('token');

  if (!botToken) {
    return NextResponse.json(
      { error: 'Bot token required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(telegramUrl(botToken, 'getMe'));
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        valid: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name,
          canJoinGroups: data.result.can_join_groups,
          canReadMessages: data.result.can_read_all_group_messages,
        },
      });
    } else {
      return NextResponse.json(
        { valid: false, error: data.description },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Failed to validate bot token' },
      { status: 500 }
    );
  }
}
