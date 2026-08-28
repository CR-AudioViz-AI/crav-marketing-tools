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



// GET - Run migration and seed data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (key !== 'cr-migrate-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Check if tables exist by trying to query
    const { error: checkError } = await supabase
      .from('social_platforms')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      results.push('Tables do not exist - need manual creation via Supabase SQL Editor');
      return NextResponse.json({
        success: false,
        message: 'Tables need to be created via Supabase SQL Editor',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/kteobfyferrukqeolofj/sql',
        results
      });
    }

    // Tables exist - seed platforms
    results.push('Tables exist - seeding platforms...');
    
    const platforms = [
      { name: 'twitter', display_name: 'Twitter/X', icon: 'twitter', category: 'social', api_type: 'oauth2', character_limit: 280, is_free_tier: true, is_active: true, features: {} },
      { name: 'facebook', display_name: 'Facebook', icon: 'facebook', category: 'social', api_type: 'oauth2', character_limit: 63206, is_free_tier: true, is_active: true, features: {} },
      { name: 'instagram', display_name: 'Instagram', icon: 'instagram', category: 'social', api_type: 'oauth2', character_limit: 2200, is_free_tier: true, is_active: true, features: {} },
      { name: 'linkedin', display_name: 'LinkedIn', icon: 'linkedin', category: 'social', api_type: 'oauth2', character_limit: 3000, is_free_tier: true, is_active: true, features: {} },
      { name: 'threads', display_name: 'Threads', icon: 'threads', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: true, is_active: true, features: {} },
      { name: 'discord', display_name: 'Discord', icon: 'discord', category: 'community', api_type: 'webhook', character_limit: 2000, is_free_tier: true, is_active: true, features: {} },
      { name: 'slack', display_name: 'Slack', icon: 'slack', category: 'messaging', api_type: 'webhook', character_limit: 40000, is_free_tier: true, is_active: true, features: {} },
      { name: 'telegram', display_name: 'Telegram', icon: 'telegram', category: 'messaging', api_type: 'bot_token', character_limit: 4096, is_free_tier: true, is_active: true, features: {} },
      { name: 'mastodon', display_name: 'Mastodon', icon: 'mastodon', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: true, is_active: true, features: {} },
      { name: 'bluesky', display_name: 'Bluesky', icon: 'bluesky', category: 'social', api_type: 'api_key', character_limit: 300, is_free_tier: true, is_active: true, features: {} },
      { name: 'youtube', display_name: 'YouTube', icon: 'youtube', category: 'video', api_type: 'oauth2', character_limit: 5000, is_free_tier: false, is_active: true, features: {} },
      { name: 'tiktok', display_name: 'TikTok', icon: 'tiktok', category: 'video', api_type: 'oauth2', character_limit: 2200, is_free_tier: false, is_active: true, features: {} },
      { name: 'pinterest', display_name: 'Pinterest', icon: 'pinterest', category: 'social', api_type: 'oauth2', character_limit: 500, is_free_tier: false, is_active: true, features: {} },
      { name: 'reddit', display_name: 'Reddit', icon: 'reddit', category: 'community', api_type: 'oauth2', character_limit: 40000, is_free_tier: true, is_active: true, features: {} },
      { name: 'tumblr', display_name: 'Tumblr', icon: 'tumblr', category: 'publishing', api_type: 'oauth2', character_limit: null, is_free_tier: true, is_active: true, features: {} },
    ];

    const { data: inserted, error: insertError } = await supabase
      .from('social_platforms')
      .upsert(platforms, { onConflict: 'name' })
      .select('name');

    if (insertError) {
      results.push('Insert error: ' + insertError.message);
    } else {
      results.push('Seeded ' + (inserted?.length || 0) + ' platforms');
    }

    // Get final count
    const { data: allPlatforms } = await supabase
      .from('social_platforms')
      .select('name, display_name, is_free_tier')
      .order('name');

    return NextResponse.json({
      success: true,
      message: 'Migration complete',
      platformCount: allPlatforms?.length || 0,
      platforms: allPlatforms,
      results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}
