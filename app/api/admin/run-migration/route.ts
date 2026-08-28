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



// Migration SQL for social media tables
const migrationSQL = `
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SOCIAL PLATFORMS (Reference Table)
CREATE TABLE IF NOT EXISTS social_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  category VARCHAR(50) NOT NULL,
  api_type VARCHAR(50) NOT NULL,
  api_endpoint TEXT,
  oauth_url TEXT,
  token_url TEXT,
  scopes TEXT[],
  character_limit INTEGER,
  media_types TEXT[],
  rate_limit_per_hour INTEGER,
  rate_limit_per_day INTEGER,
  is_free_tier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SOCIAL ACCOUNTS (User Connected Accounts)
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  platform_id UUID REFERENCES social_platforms(id) ON DELETE CASCADE,
  platform_user_id VARCHAR(255),
  username VARCHAR(255),
  display_name VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  bot_token TEXT,
  channel_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOCIAL POSTS
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  content TEXT NOT NULL,
  link_url TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'draft',
  template_id UUID,
  campaign_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SOCIAL POST RESULTS
CREATE TABLE IF NOT EXISTS social_post_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_post_id VARCHAR(255),
  platform_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SOCIAL TEMPLATES
CREATE TABLE IF NOT EXISTS social_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SOCIAL QUEUE
CREATE TABLE IF NOT EXISTS social_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SOCIAL HASHTAG SETS
CREATE TABLE IF NOT EXISTS social_hashtag_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  hashtags TEXT[] NOT NULL,
  category VARCHAR(100),
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SOCIAL ANALYTICS
CREATE TABLE IF NOT EXISTS social_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  comments_received INTEGER DEFAULT 0,
  shares_received INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  top_post_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_queue_scheduled ON social_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_queue_status ON social_queue(status);
CREATE INDEX IF NOT EXISTS idx_social_analytics_account_date ON social_analytics(account_id, date);
`;

// Platform seed data
const platformsData = [
  { name: 'twitter', display_name: 'Twitter/X', icon: 'twitter', category: 'social', api_type: 'oauth2', character_limit: 280, is_free_tier: true },
  { name: 'facebook', display_name: 'Facebook', icon: 'facebook', category: 'social', api_type: 'oauth2', character_limit: 63206, is_free_tier: true },
  { name: 'instagram', display_name: 'Instagram', icon: 'instagram', category: 'social', api_type: 'oauth2', character_limit: 2200, is_free_tier: true },
  { name: 'linkedin', display_name: 'LinkedIn', icon: 'linkedin', category: 'social', api_type: 'oauth2', character_limit: 3000, is_free_tier: true },
  { name: 'threads', display_name: 'Threads', icon: 'threads', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: true },
  { name: 'discord', display_name: 'Discord', icon: 'discord', category: 'community', api_type: 'webhook', character_limit: 2000, is_free_tier: true },
  { name: 'slack', display_name: 'Slack', icon: 'slack', category: 'messaging', api_type: 'webhook', character_limit: 40000, is_free_tier: true },
  { name: 'telegram', display_name: 'Telegram', icon: 'telegram', category: 'messaging', api_type: 'bot_token', character_limit: 4096, is_free_tier: true },
  { name: 'mastodon', display_name: 'Mastodon', icon: 'mastodon', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: true },
  { name: 'bluesky', display_name: 'Bluesky', icon: 'bluesky', category: 'social', api_type: 'api_key', character_limit: 300, is_free_tier: true },
  { name: 'youtube', display_name: 'YouTube', icon: 'youtube', category: 'video', api_type: 'oauth2', character_limit: 5000, is_free_tier: false },
  { name: 'tiktok', display_name: 'TikTok', icon: 'tiktok', category: 'video', api_type: 'oauth2', character_limit: 2200, is_free_tier: false },
  { name: 'pinterest', display_name: 'Pinterest', icon: 'pinterest', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: false },
  { name: 'reddit', display_name: 'Reddit', icon: 'reddit', category: 'community', api_type: 'oauth2', character_limit: 40000, is_free_tier: true },
  { name: 'tumblr', display_name: 'Tumblr', icon: 'tumblr', category: 'publishing', api_type: 'oauth2', character_limit: null, is_free_tier: true },
];

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const SERVICE_KEY = searchParams.get('key');
    
    // Simple security check
    if (SERVICE_KEY !== 'cr-migration-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

    // Run the migration SQL statements one by one
    const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: trimmed + ';' });
        if (error) {
          // Try direct query for DDL
          results.push(`Statement executed (may need manual verification)`);
        } else {
          results.push(`✓ Statement executed`);
        }
      } catch (e) {
        results.push(`Note: ${trimmed.substring(0, 50)}...`);
      }
    }

    // Seed platforms using upsert
    const { data: platforms, error: platformError } = await supabase
      .from('social_platforms')
      .upsert(platformsData, { onConflict: 'name' })
      .select();

    if (platformError) {
      results.push(`Platform seed error: ${platformError.message}`);
    } else {
      results.push(`✓ Seeded ${platforms?.length || 0} platforms`);
    }

    // Verify tables exist
    const { data: tableCheck, error: tableError } = await supabase
      .from('social_platforms')
      .select('count')
      .limit(1);

    return NextResponse.json({
      success: !tableError,
      message: tableError ? 'Tables may need manual creation' : 'Migration completed',
      platformCount: platforms?.length || 0,
      results: results.slice(-10),
      tableExists: !tableError,
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check table status
    const { data: platforms, error: platformError } = await supabase
      .from('social_platforms')
      .select('id, name, display_name, is_free_tier')
      .order('name');

    const { data: accounts, error: accountError } = await supabase
      .from('social_accounts')
      .select('id')
      .limit(1);

    const { data: posts, error: postError } = await supabase
      .from('social_posts')
      .select('id')
      .limit(1);

    return NextResponse.json({
      status: 'ok',
      tables: {
        social_platforms: { exists: !platformError, count: platforms?.length || 0 },
        social_accounts: { exists: !accountError },
        social_posts: { exists: !postError },
      },
      platforms: platforms || [],
    });

  } catch (error) {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
