export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { assertMastodonInstance } from '@/lib/social/egress';

// Mastodon is decentralized - each instance has its own API
// User provides: instance URL + access token (from their instance settings)

interface MastodonPostRequest {
  instanceUrl: string; // e.g., "mastodon.social" or "fosstodon.org"
  accessToken: string;
  content: string;
  mediaIds?: string[];
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  contentWarning?: string;
}

// POST - Create a status on Mastodon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MastodonPostRequest;
    const { instanceUrl, accessToken, content, mediaIds, visibility, contentWarning } = body;

    if (!instanceUrl || !accessToken || !content) {
      return NextResponse.json(
        { error: 'instanceUrl, accessToken, and content are required' },
        { status: 400 }
      );
    }

    // Clean instance URL
    // Federated, so the host is legitimately the caller's choice — but it
    // must still be a plain public hostname, not a private range, not
    // 169.254.169.254, and not a name that resolves to either.
    const instance = await assertMastodonInstance(instanceUrl);

    // Mastodon has 500 char limit by default (some instances allow more)
    const truncatedContent = content.length > 500 ? content.substring(0, 497) + '...' : content;

    const response = await fetch(`https://${instance}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: truncatedContent,
        media_ids: mediaIds || [],
        visibility: visibility || 'public',
        spoiler_text: contentWarning || '',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.error || 'Failed to post to Mastodon',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      postId: data.id,
      postUrl: data.url,
      content: data.content,
      visibility: data.visibility,
      createdAt: data.created_at,
    });

  } catch (error) {
    console.error('Mastodon post error:', error);
    return NextResponse.json(
      { error: 'Failed to post to Mastodon' },
      { status: 500 }
    );
  }
}

// GET - Verify Mastodon credentials
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instanceUrl = searchParams.get('instanceUrl');
  const accessToken = searchParams.get('accessToken');

  if (!instanceUrl || !accessToken) {
    return NextResponse.json(
      { error: 'instanceUrl and accessToken required' },
      { status: 400 }
    );
  }

  const instance = await assertMastodonInstance(instanceUrl);

  try {
    const response = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid credentials',
      }, { status: 401 });
    }

    const data = await response.json();

    return NextResponse.json({
      valid: true,
      account: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatar: data.avatar,
        followersCount: data.followers_count,
        followingCount: data.following_count,
        statusesCount: data.statuses_count,
      },
      instance: {
        url: instance,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Failed to verify credentials' },
      { status: 500 }
    );
  }
}
