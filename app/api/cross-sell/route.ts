import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - CROSS-SELL API
// GET /api/cross-sell - Get personalized javari product recommendations
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



// Full javari product catalog
const javari_PRODUCTS = [
  // Creative Tools
  {
    id: 'social-graphics',
    name: 'Social Graphics Generator',
    category: 'creative',
    description: 'AI-powered social media graphics in seconds',
    url: 'https://craudiovizai.com/tools/social-graphics',
    features: ['AI image generation', 'Brand templates', 'Multi-platform sizes'],
    pricing: 'Included in subscription',
    tags: ['social', 'design', 'graphics', 'instagram', 'twitter'],
  },
  {
    id: 'video-creator',
    name: 'Video Creator',
    category: 'creative',
    description: 'Create professional videos with AI',
    url: 'https://craudiovizai.com/tools/video-creator',
    features: ['AI video generation', 'Templates', 'Auto-captions'],
    pricing: 'Included in subscription',
    tags: ['video', 'youtube', 'tiktok', 'reels'],
  },
  {
    id: 'logo-maker',
    name: 'Logo Maker',
    category: 'creative',
    description: 'Generate unique logos with AI',
    url: 'https://craudiovizai.com/tools/logo-maker',
    features: ['AI logo generation', 'Vector export', 'Variations'],
    pricing: 'Included in subscription',
    tags: ['logo', 'branding', 'design'],
  },
  {
    id: 'thumbnail-creator',
    name: 'Thumbnail Creator',
    category: 'creative',
    description: 'Eye-catching YouTube thumbnails',
    url: 'https://craudiovizai.com/tools/thumbnail-creator',
    features: ['AI generation', 'A/B testing', 'Templates'],
    pricing: 'Included in subscription',
    tags: ['youtube', 'thumbnails', 'video'],
  },

  // Writing Tools
  {
    id: 'writing-assistant',
    name: 'Writing Assistant',
    category: 'writing',
    description: 'AI writing with your brand voice',
    url: 'https://craudiovizai.com/tools/writing-assistant',
    features: ['Blog posts', 'Ad copy', 'Emails', 'Social captions'],
    pricing: 'Included in subscription',
    tags: ['writing', 'content', 'blog', 'copywriting'],
  },
  {
    id: 'email-builder',
    name: 'Email Builder',
    category: 'writing',
    description: 'Create email campaigns with AI',
    url: 'https://craudiovizai.com/tools/email-builder',
    features: ['AI copywriting', 'Templates', 'A/B testing'],
    pricing: 'Included in subscription',
    tags: ['email', 'marketing', 'js_campaigns'],
  },
  {
    id: 'script-writer',
    name: 'Script Writer',
    category: 'writing',
    description: 'Video scripts and podcast outlines',
    url: 'https://craudiovizai.com/tools/script-writer',
    features: ['Video scripts', 'Podcast outlines', 'Ad scripts'],
    pricing: 'Included in subscription',
    tags: ['script', 'video', 'podcast', 'youtube'],
  },

  // Marketing Tools
  {
    id: 'seo-analyzer',
    name: 'SEO Analyzer',
    category: 'marketing',
    description: 'Optimize your content for search',
    url: 'https://craudiovizai.com/tools/seo-analyzer',
    features: ['Keyword analysis', 'Content scoring', 'Recommendations'],
    pricing: 'Included in subscription',
    tags: ['seo', 'keywords', 'content', 'search'],
  },
  {
    id: 'ad-copy-generator',
    name: 'Ad Copy Generator',
    category: 'marketing',
    description: 'High-converting ad copy with AI',
    url: 'https://craudiovizai.com/tools/ad-copy',
    features: ['Facebook ads', 'Google ads', 'LinkedIn ads'],
    pricing: 'Included in subscription',
    tags: ['ads', 'advertising', 'copy', 'facebook', 'google'],
  },
  {
    id: 'landing-builder',
    name: 'Landing Page Builder',
    category: 'marketing',
    description: 'Build landing pages that convert',
    url: 'https://craudiovizai.com/tools/landing',
    features: ['AI copywriting', 'Templates', 'A/B testing'],
    pricing: 'Included in subscription',
    tags: ['landing', 'conversion', 'website'],
  },

  // Business Tools
  {
    id: 'pitch-deck',
    name: 'Pitch Deck Creator',
    category: 'business',
    description: 'Professional pitch decks with AI',
    url: 'https://craudiovizai.com/tools/pitch-deck',
    features: ['AI content', 'Templates', 'Export to PDF'],
    pricing: 'Included in subscription',
    tags: ['pitch', 'investor', 'presentation', 'fundraising'],
  },
  {
    id: 'business-plan',
    name: 'Business Plan Generator',
    category: 'business',
    description: 'Complete business plans with AI',
    url: 'https://craudiovizai.com/tools/business-plan',
    features: ['Financial projections', 'Market analysis', 'Templates'],
    pricing: 'Included in subscription',
    tags: ['business', 'plan', 'startup', 'investor'],
  },

  // Audio Tools
  {
    id: 'podcast-editor',
    name: 'Podcast Editor',
    category: 'audio',
    description: 'Edit podcasts with AI assistance',
    url: 'https://craudiovizai.com/tools/podcast',
    features: ['AI editing', 'Noise removal', 'Transcription'],
    pricing: 'Included in subscription',
    tags: ['podcast', 'audio', 'editing'],
  },
  {
    id: 'music-generator',
    name: 'Music Generator',
    category: 'audio',
    description: 'Create royalty-free music with AI',
    url: 'https://craudiovizai.com/tools/music',
    features: ['AI composition', 'Multiple genres', 'Commercial license'],
    pricing: 'Included in subscription',
    tags: ['music', 'audio', 'background', 'royalty-free'],
  },
];

// Recommendation rules
interface RecommendationRule {
  trigger: string[];
  products: string[];
  reason: string;
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    trigger: ['social', 'instagram', 'twitter', 'facebook'],
    products: ['social-graphics', 'video-creator', 'ad-copy-generator'],
    reason: 'Perfect for your social media marketing',
  },
  {
    trigger: ['email', 'newsletter'],
    products: ['email-builder', 'writing-assistant'],
    reason: 'Boost your email marketing',
  },
  {
    trigger: ['video', 'youtube', 'tiktok'],
    products: ['video-creator', 'thumbnail-creator', 'script-writer'],
    reason: 'Level up your video content',
  },
  {
    trigger: ['seo', 'search', 'content'],
    products: ['seo-analyzer', 'writing-assistant'],
    reason: 'Dominate search rankings',
  },
  {
    trigger: ['startup', 'investor', 'fundraising'],
    products: ['pitch-deck', 'business-plan'],
    reason: 'Essential for fundraising',
  },
  {
    trigger: ['podcast', 'audio'],
    products: ['podcast-editor', 'music-generator', 'script-writer'],
    reason: 'Everything for audio content',
  },
  {
    trigger: ['ads', 'advertising', 'ppc'],
    products: ['ad-copy-generator', 'landing-builder', 'social-graphics'],
    reason: 'Maximize your ad performance',
  },
  {
    trigger: ['brand', 'logo', 'design'],
    products: ['logo-maker', 'social-graphics'],
    reason: 'Build your brand identity',
  },
];


/**
 * 2026-09-06: identity from the caller's token, never from the request.
 *
 * This route took a user id from the caller and used it against a client built
 * with secretKey() - the service-role credential - which bypasses row level
 * security entirely, so it acted on whichever account the caller named.
 */
async function __callerId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id as string;
  } catch {
    return null;
  }
}

function __unauthorised() {
  return NextResponse.json({ error: 'Sign in required.', code: 'AUTH_REQUIRED' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const context = searchParams.get('context')?.toLowerCase() || '';
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '5');
  const excludeIds = searchParams.get('exclude')?.split(',') || [];

  let recommendations: typeof javari_PRODUCTS = [];
  let matchReason = 'Recommended for you';

  // Find matching rules
  if (context) {
    for (const rule of RECOMMENDATION_RULES) {
      if (rule.trigger.some((t) => context.includes(t))) {
        const matchedProducts = javari_PRODUCTS.filter(
          (p) => rule.products.includes(p.id) && !excludeIds.includes(p.id)
        );
        recommendations.push(...matchedProducts);
        matchReason = rule.reason;
      }
    }
  }

  // Filter by category if specified
  if (category) {
    recommendations = recommendations.filter((p) => p.category === category);
  }

  // If no matches, return popular products
  if (recommendations.length === 0) {
    recommendations = javari_PRODUCTS.filter(
      (p) => !excludeIds.includes(p.id)
    ).slice(0, limit);
    matchReason = 'Popular javari tools';
  }

  // Remove duplicates and limit - use Array.from for TypeScript compatibility
  const productMap = new Map(recommendations.map((p) => [p.id, p]));
  const uniqueRecommendations = Array.from(productMap.values());
  const finalRecommendations = uniqueRecommendations.slice(0, limit);

  return NextResponse.json({
    success: true,
    recommendations: finalRecommendations.map((p) => ({
      ...p,
      matchReason,
    })),
    categories: ['creative', 'writing', 'marketing', 'business', 'audio'],
    totalProducts: javari_PRODUCTS.length,
    meta: {
      context,
      category,
      matchedCount: finalRecommendations.length,
      timestamp: new Date().toISOString(),
    },
  });
}

// POST endpoint to track cross-sell clicks/conversions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {productId, action, source} = body;
    const userId = await __callerId(request);
    if (!userId) return __unauthorised();

    if (!productId || !action) {
      return NextResponse.json(
        { success: false, error: 'productId and action are required' },
        { status: 400 }
      );
    }

    // Log the cross-sell event
    await supabase.from('cross_sell_events').insert({
      product_id: productId,
      action, // 'view', 'click', 'conversion'
      source: source || 'marketing-tools',
      user_id: userId || null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Event tracked',
    });
  } catch (error) {
    console.error('Cross-sell tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
