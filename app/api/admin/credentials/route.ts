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

// Admin key for protecting this endpoint
const ADMIN_KEY = process.env.SOCIAL_ADMIN_KEY || 'cr-social-admin-2025';

interface Credentials {
  platform: string;
  credential_type: string;
  credentials: Record<string, string>;
  is_active?: boolean;
}

// GET - List all credentials (masked)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('admin_social_credentials')
    .select('platform, credential_type, is_active, last_used_at, last_verified_at, rate_limit_remaining, created_at')
    .order('platform');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    credentials: data,
    count: data?.length || 0,
    message: 'Credentials listed (values masked for security)',
  });
}

// POST - Add or update credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, platform, credential_type, credentials } = body as { key: string } & Credentials;

    if (key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!platform || !credential_type || !credentials) {
      return NextResponse.json(
        { error: 'platform, credential_type, and credentials are required' },
        { status: 400 }
      );
    }

    // Validate credential_type
    const validTypes = ['oauth', 'api_key', 'webhook', 'bot_token', 'app_password'];
    if (!validTypes.includes(credential_type)) {
      return NextResponse.json(
        { error: `credential_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert credentials
    const { data, error } = await supabase
      .from('admin_social_credentials')
      .upsert({
        platform: platform.toLowerCase(),
        credential_type,
        credentials,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      platform: data.platform,
      credential_type: data.credential_type,
      message: `Credentials for ${platform} saved successfully`,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE - Remove credentials
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const platform = searchParams.get('platform');

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('admin_social_credentials')
    .delete()
    .eq('platform', platform.toLowerCase());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Credentials for ${platform} removed`,
  });
}
