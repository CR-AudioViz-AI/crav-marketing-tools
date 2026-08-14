export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - OPPORTUNITY MONITOR API
// Scans Reddit, HN for marketing opportunities
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  permalink: string;
  createdUtc: number;
  isQuestion: boolean;
}

interface MarketOpportunity {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  nicheMatch: string[];
  suggestedResponse?: string;
  engagement: {
    score?: number;
    comments?: number;
  };
  createdAt: string;
}

// ============================================================================
// REDDIT API (FREE)
// ============================================================================

async function searchReddit(query: string, subreddit?: string, limit: number = 25): Promise<RedditPost[]> {
  try {
    const baseUrl = subreddit 
      ? `https://www.reddit.com/r/${subreddit}/search.json`
      : `https://www.reddit.com/search.json`;
    
    const params = new URLSearchParams({
      q: query,
      sort: 'new',
      t: 'week',
      limit: limit.toString(),
      restrict_sr: subreddit ? 'true' : 'false',
    });

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: { 'User-Agent': 'JavariMarketingBot/1.0' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    return data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || '',
      author: child.data.author,
      subreddit: child.data.subreddit,
      score: child.data.score,
      numComments: child.data.num_comments,
      permalink: `https://reddit.com${child.data.permalink}`,
      createdUtc: child.data.created_utc,
      isQuestion: child.data.title.includes('?') || 
                  child.data.title.toLowerCase().startsWith('what') ||
                  child.data.title.toLowerCase().startsWith('how') ||
                  child.data.title.toLowerCase().startsWith('anyone'),
    }));
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

// ============================================================================
// HACKER NEWS API (FREE)
// ============================================================================

async function searchHN(query: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      query,
      tags: 'story',
      hitsPerPage: '20',
    });

    const response = await fetch(`https://hn.algolia.com/api/v1/search?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    
    return data.hits.map((hit: any) => ({
      id: hit.objectID,
      title: hit.title,
      url: hit.url,
      author: hit.author,
      points: hit.points,
      numComments: hit.num_comments,
      createdAt: hit.created_at,
      storyUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));
  } catch (error) {
    console.error('HN search error:', error);
    return [];
  }
}

// ============================================================================
// NICHE CONFIGS
// ============================================================================

const NICHE_KEYWORDS: Record<string, { keywords: string[], subreddits: string[] }> = {
  'crochet': {
    keywords: ['crochet', 'yarn', 'pattern', 'amigurumi'],
    subreddits: ['crochet', 'Brochet', 'crochetpatterns'],
  },
  'scrapbooking': {
    keywords: ['scrapbook', 'paper craft', 'memory keeping'],
    subreddits: ['scrapbooking', 'crafts', 'papercrafts'],
  },
  'whiskey-bourbon': {
    keywords: ['whiskey', 'bourbon', 'scotch', 'collection'],
    subreddits: ['bourbon', 'whiskey', 'Scotch'],
  },
  'sports-cards': {
    keywords: ['trading cards', 'baseball cards', 'grading'],
    subreddits: ['baseballcards', 'basketballcards', 'footballcards'],
  },
  'saas': {
    keywords: ['saas', 'software', 'startup', 'app'],
    subreddits: ['SaaS', 'startups', 'Entrepreneur'],
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function calculateRelevance(post: RedditPost, keywords: string[]): number {
  let score = 0;
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) score += 0.2;
  }
  
  if (post.isQuestion) score += 0.3;
  if (post.numComments < 10) score += 0.2;
  if (post.numComments < 5) score += 0.1;
  
  const hoursSincePost = (Date.now() / 1000 - post.createdUtc) / 3600;
  if (hoursSincePost < 24) score += 0.2;
  if (hoursSincePost < 6) score += 0.1;
  
  return Math.min(score, 1);
}

function generateSuggestedResponse(isQuestion: boolean): string {
  const templates = isQuestion ? [
    `Great question! I've been researching this too. What specific features are most important to you?`,
    `I was just dealing with this! Here's what I've learned... Have you tried breaking it down into smaller steps?`,
    `This is something a lot of people ask about. The key things to consider are ease of use and your specific needs.`,
  ] : [
    `Interesting perspective! I've seen similar patterns in my experience. What led you to this conclusion?`,
    `This resonates with me. Would love to hear more about your approach.`,
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// ============================================================================
// GET - Find opportunities
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche');
    const keywords = searchParams.get('keywords')?.split(',') || [];
    const sources = searchParams.get('sources')?.split(',') || ['reddit', 'hackernews'];
    const limit = parseInt(searchParams.get('limit') || '20');

    // Return API info if no params
    if (!niche && keywords.length === 0) {
      return NextResponse.json({
        service: 'Opportunity Monitor API',
        description: 'Find marketing opportunities across Reddit and Hacker News',
        status: 'operational',
        endpoints: {
          'GET /api/opportunities?niche=crochet': 'Find opportunities for a niche',
          'GET /api/opportunities?keywords=tool,app,help': 'Search by keywords',
        },
        availableNiches: Object.keys(NICHE_KEYWORDS),
        availableSources: ['reddit', 'hackernews'],
      });
    }

    // Get niche config
    const nicheConfig = niche ? NICHE_KEYWORDS[niche] : null;
    const searchKeywords = nicheConfig 
      ? [...new Set([...keywords, ...nicheConfig.keywords])]
      : keywords;
    const subreddits = nicheConfig?.subreddits || ['Entrepreneur', 'smallbusiness'];

    const opportunities: MarketOpportunity[] = [];
    const errors: string[] = [];

    // Search Reddit
    if (sources.includes('reddit') && searchKeywords.length > 0) {
      for (const subreddit of subreddits.slice(0, 3)) {
        for (const keyword of searchKeywords.slice(0, 2)) {
          const posts = await searchReddit(keyword, subreddit, 10);
          
          for (const post of posts) {
            if (post.isQuestion || post.numComments < 20) {
              opportunities.push({
                id: `reddit_${post.id}`,
                source: 'reddit',
                title: post.title,
                content: post.selftext.slice(0, 300),
                url: post.permalink,
                relevanceScore: calculateRelevance(post, searchKeywords),
                nicheMatch: searchKeywords.filter(k => 
                  post.title.toLowerCase().includes(k.toLowerCase())
                ),
                suggestedResponse: generateSuggestedResponse(post.isQuestion),
                engagement: {
                  score: post.score,
                  comments: post.numComments,
                },
                createdAt: new Date(post.createdUtc * 1000).toISOString(),
              });
            }
          }
          
          // Rate limit protection
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // Search Hacker News
    if (sources.includes('hackernews') && searchKeywords.length > 0) {
      for (const keyword of searchKeywords.slice(0, 3)) {
        const stories = await searchHN(keyword);
        
        for (const story of stories.slice(0, 5)) {
          opportunities.push({
            id: `hn_${story.id}`,
            source: 'hackernews',
            title: story.title,
            content: '',
            url: story.storyUrl,
            relevanceScore: story.points > 50 ? 0.8 : 0.5,
            nicheMatch: [keyword],
            engagement: {
              score: story.points,
              comments: story.numComments,
            },
            createdAt: story.createdAt,
          });
        }
      }
    }

    // Sort and limit
    opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const limitedOpportunities = opportunities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        opportunities: limitedOpportunities,
        meta: {
          totalFound: opportunities.length,
          returned: limitedOpportunities.length,
          sources,
          keywords: searchKeywords,
          niche: niche || null,
        },
        actionItems: [
          `🔥 ${limitedOpportunities.filter(o => o.relevanceScore > 0.7).length} high-relevance opportunities`,
          `❓ ${limitedOpportunities.filter(o => o.title.includes('?')).length} questions to answer`,
          '📝 Review suggested responses and personalize before posting',
          '⏰ Best response time: within 2-6 hours of original post',
        ],
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Opportunity API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Comprehensive research
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, niche } = body;

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keywords array required' },
        { status: 400 }
      );
    }

    // Redirect to GET with params
    const url = new URL(request.url);
    url.searchParams.set('keywords', keywords.join(','));
    if (niche) url.searchParams.set('niche', niche);

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
