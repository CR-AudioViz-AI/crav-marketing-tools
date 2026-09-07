import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'cr-javari-social-encryption-key!'; // Must be 32 chars in production

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Check tenant limits
async function checkConnectionLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number; message?: string }> {
  const { data: tenant } = await supabase
    .from('js_tenants')
    .select('max_platforms, subscription_status, trial_ends_at')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    return { allowed: false, current: 0, max: 0, message: 'Tenant not found' };
  }

  // Check trial expiry
  if (tenant.subscription_status === 'trialing' && tenant.trial_ends_at) {
    if (new Date(tenant.trial_ends_at) < new Date()) {
      return { allowed: false, current: 0, max: tenant.max_platforms, message: 'Trial expired. Please upgrade to continue.' };
    }
  }

  // Check subscription status
  if (['canceled', 'paused', 'past_due'].includes(tenant.subscription_status)) {
    return { allowed: false, current: 0, max: tenant.max_platforms, message: 'Subscription inactive. Please update payment.' };
  }

  const { count } = await supabase
    .from('js_connections')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  const currentCount = count || 0;
  const allowed = currentCount < tenant.max_platforms;

  return {
    allowed,
    current: currentCount,
    max: tenant.max_platforms,
    message: allowed ? undefined : `Platform limit reached (${currentCount}/${tenant.max_platforms}). Upgrade for more.`,
  };
}

// GET - List connections for tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const { data: connections, error } = await supabase
      .from('js_connections')
      .select(`
        id,
        platform_id,
        platform_username,
        platform_display_name,
        platform_avatar_url,
        status,
        last_used_at,
        last_verified_at,
        last_error,
        rate_limit_remaining,
        posts_today,
        created_at,
        platform:js_platforms(name, display_name, icon, auth_type, character_limit, rate_limit_per_day)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Check limits
    const limits = await checkConnectionLimit(tenantId);

    return NextResponse.json({
      connections,
      limits: {
        current: limits.current,
        max: limits.max,
        canAddMore: limits.allowed,
      },
    });

  } catch (error) {
    console.error('Get connections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      platformName,
      credentials,
      platformUserId,
      platformUsername,
      platformDisplayName,
      platformAvatarUrl,
    } = body;

    if (!tenantId || !platformName || !credentials) {
      return NextResponse.json(
        { error: 'tenantId, platformName, and credentials are required' },
        { status: 400 }
      );
    }

    // Check limits
    const limits = await checkConnectionLimit(tenantId);
    if (!limits.allowed) {
      return NextResponse.json(
        { error: limits.message, limits },
        { status: 403 }
      );
    }

    // Get platform
    const { data: platform } = await supabase
      .from('js_platforms')
      .select('id, auth_type')
      .eq('name', platformName.toLowerCase())
      .single();

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Prepare connection data based on auth type
    const connectionData: Record<string, unknown> = {
      tenant_id: tenantId,
      platform_id: platform.id,
      platform_user_id: platformUserId,
      platform_username: platformUsername,
      platform_display_name: platformDisplayName,
      platform_avatar_url: platformAvatarUrl,
      credentials_encrypted: encryptedCredentials,
      status: 'active',
      last_verified_at: new Date().toISOString(),
    };

    // Add auth-type specific encrypted fields
    if (credentials.access_token) {
      connectionData.access_token_encrypted = encrypt(credentials.access_token);
    }
    if (credentials.refresh_token) {
      connectionData.refresh_token_encrypted = encrypt(credentials.refresh_token);
    }
    if (credentials.webhook_url) {
      connectionData.webhook_url_encrypted = encrypt(credentials.webhook_url);
    }
    if (credentials.bot_token) {
      connectionData.bot_token_encrypted = encrypt(credentials.bot_token);
    }
    if (credentials.channel_id) {
      connectionData.channel_id = credentials.channel_id;
    }
    if (credentials.expires_at) {
      connectionData.token_expires_at = credentials.expires_at;
    }

    // Upsert connection
    const { data: connection, error } = await supabase
      .from('js_connections')
      .upsert(connectionData, {
        onConflict: 'tenant_id,platform_id,platform_user_id',
      })
      .select(`
        id,
        platform_username,
        platform_display_name,
        status,
        platform:js_platforms(name, display_name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      connection,
      message: `${platformName} connected successfully!`,
    });

  } catch (error) {
    console.error('Add connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove/revoke connection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!connectionId || !tenantId) {
      return NextResponse.json({ error: 'id and tenantId required' }, { status: 400 });
    }

    // Verify ownership and delete
    const { error } = await supabase
      .from('js_connections')
      .delete()
      .eq('id', connectionId)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Connection removed. Credentials deleted permanently.',
    });

  } catch (error) {
    console.error('Delete connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update connection status or refresh tokens
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, tenantId, action, newCredentials } = body;

    if (!connectionId || !tenantId) {
      return NextResponse.json({ error: 'connectionId and tenantId required' }, { status: 400 });
    }

    if (action === 'refresh' && newCredentials) {
      // Update tokens
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        status: 'active',
      };

      if (newCredentials.access_token) {
        updateData.access_token_encrypted = encrypt(newCredentials.access_token);
      }
      if (newCredentials.refresh_token) {
        updateData.refresh_token_encrypted = encrypt(newCredentials.refresh_token);
      }
      if (newCredentials.expires_at) {
        updateData.token_expires_at = newCredentials.expires_at;
      }

      updateData.credentials_encrypted = encrypt(JSON.stringify(newCredentials));

      const { error } = await supabase
        .from('js_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('tenant_id', tenantId);

      if (error) {
        return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Credentials refreshed successfully',
      });
    }

    if (action === 'verify') {
      // Mark as verified
      await supabase
        .from('js_connections')
        .update({
          last_verified_at: new Date().toISOString(),
          last_error: null,
          status: 'active',
        })
        .eq('id', connectionId)
        .eq('tenant_id', tenantId);

      return NextResponse.json({ success: true, message: 'Connection verified' });
    }

    if (action === 'pause') {
      await supabase
        .from('js_connections')
        .update({ status: 'paused' })
        .eq('id', connectionId)
        .eq('tenant_id', tenantId);

      return NextResponse.json({ success: true, message: 'Connection paused' });
    }

    if (action === 'resume') {
      // Check limits before resuming
      const limits = await checkConnectionLimit(tenantId);
      if (!limits.allowed) {
        return NextResponse.json(
          { error: limits.message, limits },
          { status: 403 }
        );
      }

      await supabase
        .from('js_connections')
        .update({ status: 'active' })
        .eq('id', connectionId)
        .eq('tenant_id', tenantId);

      return NextResponse.json({ success: true, message: 'Connection resumed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Update connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
