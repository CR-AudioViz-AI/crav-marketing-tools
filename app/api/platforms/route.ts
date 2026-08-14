export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - PLATFORMS FINDER API
// GET /api/platforms - Search and filter marketing platforms
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  PLATFORMS,
  PLATFORM_CATEGORIES,
  JAVARI_TOOLS,
  getPlatformsByCategory,
  getPlatformsByTier,
  getFreePlatforms,
  searchPlatforms,
  type PlatformCategory,
} from '@/config/platforms';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q');
  const category = searchParams.get('category') as PlatformCategory | null;
  const tier = searchParams.get('tier') as 'free' | 'budget' | 'premium' | null;
  const includeJavari = searchParams.get('includeJavari') !== 'false';
  const limit = parseInt(searchParams.get('limit') || '50');

  let platforms = [...PLATFORMS];

  // Apply search query
  if (query) {
    platforms = searchPlatforms(query);
  }

  // Apply category filter
  if (category && PLATFORM_CATEGORIES.find((c) => c.id === category)) {
    platforms = platforms.filter((p) => p.category === category);
  }

  // Apply tier filter
  if (tier && ['free', 'budget', 'premium'].includes(tier)) {
    platforms = platforms.filter((p) => p.tier === tier);
  }

  // Sort: FREE first, then budget, then premium
  platforms.sort((a, b) => {
    const tierOrder = { free: 0, budget: 1, premium: 2 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  // Apply limit
  platforms = platforms.slice(0, limit);

  // Get JAVARI alternatives if requested
  const javariAlternatives = includeJavari
    ? JAVARI_TOOLS.filter((tool) => {
        if (category) {
          return tool.category === category;
        }
        return true;
      })
    : [];

  // Calculate stats
  const stats = {
    total: PLATFORMS.length,
    free: getFreePlatforms().length,
    budget: getPlatformsByTier('budget').length,
    premium: getPlatformsByTier('premium').length,
    byCategory: PLATFORM_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: getPlatformsByCategory(cat.id).length,
    })),
  };

  return NextResponse.json({
    success: true,
    platforms,
    javariAlternatives,
    categories: PLATFORM_CATEGORIES,
    stats,
    meta: {
      query,
      category,
      tier,
      returned: platforms.length,
      timestamp: new Date().toISOString(),
    },
  });
}

// POST endpoint for personalized recommendations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industry, goal, budget, channels } = body;

    // Get relevant platforms based on criteria
    let recommendations = [...PLATFORMS];

    // Filter by budget
    if (budget === 0) {
      recommendations = recommendations.filter((p) => p.tier === 'free');
    } else if (budget < 500) {
      recommendations = recommendations.filter((p) => p.tier !== 'premium');
    }

    // Filter by channels
    if (channels && channels.length > 0) {
      recommendations = recommendations.filter((p) =>
        channels.includes(p.category)
      );
    }

    // Sort by relevance (FREE first)
    recommendations.sort((a, b) => {
      const tierOrder = { free: 0, budget: 1, premium: 2 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });

    // Get matching JAVARI tools
    const javariRecommendations = JAVARI_TOOLS.filter((tool) =>
      channels?.includes(tool.category)
    ).map((tool) => ({
      ...tool,
      reason: `Enhance your ${tool.category} marketing with AI`,
    }));

    // Generate insights
    const insights: string[] = [];
    
    if (budget === 0) {
      insights.push(
        `Found ${recommendations.length} FREE platforms for your marketing needs`
      );
    }
    
    const freeCount = recommendations.filter((p) => p.tier === 'free').length;
    if (freeCount > 0) {
      insights.push(
        `${freeCount} of these are completely FREE to use`
      );
    }

    if (javariRecommendations.length > 0) {
      insights.push(
        `${javariRecommendations.length} JAVARI tools can help automate your workflow`
      );
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, 20),
      javariRecommendations,
      insights,
      meta: {
        criteria: { industry, goal, budget, channels },
        totalMatches: recommendations.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Platform recommendations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
