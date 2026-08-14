// ============================================================================
// CR AUDIOVIZ AI - COMPREHENSIVE FREE APIs LIBRARY
// Every possible free API for maximum reach at zero cost
// Generated: December 18, 2025
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cached?: boolean;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  permalink: string;
  createdUtc: number;
  isQuestion: boolean;
}

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants: number;
  time: number;
  type: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage?: string;
}

export interface TrendData {
  keyword: string;
  interest: number;
  relatedQueries: string[];
  risingQueries: string[];
}

export interface DemographicData {
  zipCode: string;
  population: number;
  medianAge: number;
  medianIncome: number;
  householdSize: number;
  educationBachelor: number;
  employmentRate: number;
  homeOwnership: number;
  marketingInsights: string[];
}

export interface MarketOpportunity {
  id: string;
  source: 'reddit' | 'twitter' | 'quora' | 'hackernews' | 'producthunt';
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  nicheMatch: string[];
  suggestedResponse?: string;
  engagement: {
    score?: number;
    comments?: number;
    views?: number;
  };
  createdAt: string;
}

// ============================================================================
// REDDIT API (FREE - No key required for public data)
// ============================================================================

const REDDIT_BASE = 'https://www.reddit.com';

export async function searchReddit(
  query: string,
  options: {
    subreddit?: string;
    sort?: 'relevance' | 'hot' | 'top' | 'new';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    limit?: number;
  } = {}
): Promise<APIResponse<RedditPost[]>> {
  try {
    const { subreddit, sort = 'relevance', time = 'week', limit = 25 } = options;
    
    const baseUrl = subreddit 
      ? `${REDDIT_BASE}/r/${subreddit}/search.json`
      : `${REDDIT_BASE}/search.json`;
    
    const params = new URLSearchParams({
      q: query,
      sort,
      t: time,
      limit: limit.toString(),
      restrict_sr: subreddit ? 'true' : 'false',
    });

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: { 'User-Agent': 'JavariMarketingBot/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    
    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || '',
      author: child.data.author,
      subreddit: child.data.subreddit,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      createdUtc: child.data.created_utc,
      isQuestion: child.data.title.includes('?') || 
                  child.data.title.toLowerCase().startsWith('what') ||
                  child.data.title.toLowerCase().startsWith('how') ||
                  child.data.title.toLowerCase().startsWith('anyone'),
    }));

    return { success: true, data: posts, source: 'reddit' };
  } catch (error) {
    return { success: false, error: String(error), source: 'reddit' };
  }
}

export async function getSubredditPosts(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
  limit: number = 25
): Promise<APIResponse<RedditPost[]>> {
  try {
    const response = await fetch(
      `${REDDIT_BASE}/r/${subreddit}/${sort}.json?limit=${limit}`,
      { headers: { 'User-Agent': 'JavariMarketingBot/1.0' } }
    );

    if (!response.ok) throw new Error(`Reddit error: ${response.status}`);

    const data = await response.json();
    
    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || '',
      author: child.data.author,
      subreddit: child.data.subreddit,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      createdUtc: child.data.created_utc,
      isQuestion: child.data.title.includes('?'),
    }));

    return { success: true, data: posts, source: 'reddit' };
  } catch (error) {
    return { success: false, error: String(error), source: 'reddit' };
  }
}

// Find questions/opportunities in Reddit
export async function findRedditOpportunities(
  keywords: string[],
  subreddits: string[]
): Promise<APIResponse<MarketOpportunity[]>> {
  try {
    const opportunities: MarketOpportunity[] = [];
    
    for (const subreddit of subreddits.slice(0, 5)) { // Limit to avoid rate limits
      for (const keyword of keywords.slice(0, 3)) {
        const result = await searchReddit(keyword, { 
          subreddit, 
          sort: 'new', 
          time: 'week',
          limit: 10 
        });
        
        if (result.success && result.data) {
          for (const post of result.data) {
            if (post.isQuestion || post.numComments < 20) { // Low competition
              opportunities.push({
                id: `reddit_${post.id}`,
                source: 'reddit',
                title: post.title,
                content: post.selftext.slice(0, 500),
                url: post.permalink,
                relevanceScore: calculateRelevance(post, keywords),
                nicheMatch: keywords.filter(k => 
                  post.title.toLowerCase().includes(k.toLowerCase()) ||
                  post.selftext.toLowerCase().includes(k.toLowerCase())
                ),
                engagement: {
                  score: post.score,
                  comments: post.numComments,
                },
                createdAt: new Date(post.createdUtc * 1000).toISOString(),
              });
            }
          }
        }
        
        // Rate limit protection
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Sort by relevance
    opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { success: true, data: opportunities.slice(0, 50), source: 'reddit' };
  } catch (error) {
    return { success: false, error: String(error), source: 'reddit' };
  }
}

function calculateRelevance(post: RedditPost, keywords: string[]): number {
  let score = 0;
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  
  // Keyword matches
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) score += 0.2;
  }
  
  // Question bonus
  if (post.isQuestion) score += 0.3;
  
  // Low competition bonus
  if (post.numComments < 10) score += 0.2;
  if (post.numComments < 5) score += 0.1;
  
  // Recency bonus
  const hoursSincePost = (Date.now() / 1000 - post.createdUtc) / 3600;
  if (hoursSincePost < 24) score += 0.2;
  if (hoursSincePost < 6) score += 0.1;
  
  return Math.min(score, 1);
}

// ============================================================================
// HACKER NEWS API (FREE - Firebase API)
// ============================================================================

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

export async function getHNTopStories(limit: number = 30): Promise<APIResponse<HNStory[]>> {
  try {
    const idsResponse = await fetch(`${HN_BASE}/topstories.json`);
    const ids: number[] = await idsResponse.json();
    
    const stories: HNStory[] = [];
    for (const id of ids.slice(0, limit)) {
      const storyResponse = await fetch(`${HN_BASE}/item/${id}.json`);
      const story = await storyResponse.json();
      if (story && story.type === 'story') {
        stories.push({
          id: story.id,
          title: story.title,
          url: story.url,
          text: story.text,
          by: story.by,
          score: story.score,
          descendants: story.descendants || 0,
          time: story.time,
          type: story.type,
        });
      }
    }

    return { success: true, data: stories, source: 'hackernews' };
  } catch (error) {
    return { success: false, error: String(error), source: 'hackernews' };
  }
}

export async function searchHN(
  query: string,
  options: {
    tags?: 'story' | 'comment' | 'ask_hn' | 'show_hn';
    numericFilters?: string;
    page?: number;
  } = {}
): Promise<APIResponse<any[]>> {
  try {
    const params = new URLSearchParams({
      query,
      tags: options.tags || 'story',
      hitsPerPage: '30',
      page: (options.page || 0).toString(),
    });

    const response = await fetch(`${HN_ALGOLIA}/search?${params}`);
    const data = await response.json();

    return { 
      success: true, 
      data: data.hits.map((hit: any) => ({
        id: hit.objectID,
        title: hit.title,
        url: hit.url,
        author: hit.author,
        points: hit.points,
        numComments: hit.num_comments,
        createdAt: hit.created_at,
        storyUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      })),
      source: 'hackernews' 
    };
  } catch (error) {
    return { success: false, error: String(error), source: 'hackernews' };
  }
}

// Find Show HN and Ask HN opportunities
export async function findHNOpportunities(keywords: string[]): Promise<APIResponse<MarketOpportunity[]>> {
  try {
    const opportunities: MarketOpportunity[] = [];
    
    // Search Ask HN (people asking questions)
    for (const keyword of keywords.slice(0, 5)) {
      const askResult = await searchHN(keyword, { tags: 'ask_hn' });
      if (askResult.success && askResult.data) {
        for (const story of askResult.data.slice(0, 10)) {
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
      await new Promise(r => setTimeout(r, 500));
    }

    return { success: true, data: opportunities, source: 'hackernews' };
  } catch (error) {
    return { success: false, error: String(error), source: 'hackernews' };
  }
}

// ============================================================================
// NEWS APIs (Multiple sources for redundancy)
// ============================================================================

// NewsAPI.org (100 requests/day free)
export async function searchNewsAPI(
  query: string,
  options: {
    category?: string;
    language?: string;
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  } = {}
): Promise<APIResponse<NewsArticle[]>> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return { success: false, error: 'NewsAPI key not configured', source: 'newsapi' };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      language: options.language || 'en',
      sortBy: options.sortBy || 'publishedAt',
      pageSize: '20',
      apiKey,
    });

    const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'NewsAPI error');
    }

    const articles: NewsArticle[] = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      urlToImage: article.urlToImage,
    }));

    return { success: true, data: articles, source: 'newsapi' };
  } catch (error) {
    return { success: false, error: String(error), source: 'newsapi' };
  }
}

// GNews API (100 requests/day free) - Backup
export async function searchGNews(query: string): Promise<APIResponse<NewsArticle[]>> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GNews key not configured', source: 'gnews' };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      lang: 'en',
      max: '10',
      token: apiKey,
    });

    const response = await fetch(`https://gnews.io/api/v4/search?${params}`);
    const data = await response.json();

    const articles: NewsArticle[] = data.articles?.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      urlToImage: article.image,
    })) || [];

    return { success: true, data: articles, source: 'gnews' };
  } catch (error) {
    return { success: false, error: String(error), source: 'gnews' };
  }
}

// MediaStack (500 requests/month free)
export async function searchMediaStack(query: string): Promise<APIResponse<NewsArticle[]>> {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'MediaStack key not configured', source: 'mediastack' };
  }

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      keywords: query,
      languages: 'en',
      limit: '20',
    });

    const response = await fetch(`http://api.mediastack.com/v1/news?${params}`);
    const data = await response.json();

    const articles: NewsArticle[] = data.data?.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.published_at,
      urlToImage: article.image,
    })) || [];

    return { success: true, data: articles, source: 'mediastack' };
  } catch (error) {
    return { success: false, error: String(error), source: 'mediastack' };
  }
}

// ============================================================================
// US CENSUS API (FREE - No key required for basic access)
// ============================================================================

const CENSUS_BASE = 'https://api.census.gov/data';

export async function getCensusDemographics(zipCode: string): Promise<APIResponse<DemographicData>> {
  try {
    // ACS 5-year estimates - most comprehensive free data
    const variables = [
      'B01003_001E', // Total population
      'B01002_001E', // Median age
      'B19013_001E', // Median household income
      'B25010_001E', // Average household size
      'B15003_022E', // Bachelor's degree
      'B15003_001E', // Total education (for percentage)
      'B23025_002E', // In labor force
      'B23025_001E', // Total labor force (for percentage)
      'B25003_002E', // Owner occupied
      'B25003_001E', // Total housing units
    ].join(',');

    // Convert ZIP to ZCTA (ZIP Code Tabulation Area)
    const response = await fetch(
      `${CENSUS_BASE}/2021/acs/acs5?get=NAME,${variables}&for=zip%20code%20tabulation%20area:${zipCode}`
    );

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.length < 2) {
      throw new Error('ZIP code not found');
    }

    const values = data[1];
    const population = parseInt(values[1]) || 0;
    const medianAge = parseFloat(values[2]) || 0;
    const medianIncome = parseInt(values[3]) || 0;
    const householdSize = parseFloat(values[4]) || 0;
    const bachelorDegree = parseInt(values[5]) || 0;
    const totalEducation = parseInt(values[6]) || 1;
    const inLaborForce = parseInt(values[7]) || 0;
    const totalLaborForce = parseInt(values[8]) || 1;
    const ownerOccupied = parseInt(values[9]) || 0;
    const totalHousing = parseInt(values[10]) || 1;

    const educationRate = Math.round((bachelorDegree / totalEducation) * 100);
    const employmentRate = Math.round((inLaborForce / totalLaborForce) * 100);
    const homeOwnershipRate = Math.round((ownerOccupied / totalHousing) * 100);

    // Generate marketing insights
    const insights: string[] = [];
    
    if (medianIncome > 75000) {
      insights.push('Higher income area - premium products may perform well');
    } else if (medianIncome < 40000) {
      insights.push('Value-conscious area - emphasize affordability and free tiers');
    }
    
    if (medianAge > 50) {
      insights.push('Older demographic - traditional marketing, email performs well');
    } else if (medianAge < 35) {
      insights.push('Younger demographic - social media, video content preferred');
    }
    
    if (educationRate > 40) {
      insights.push('Highly educated - detailed content, technical depth appreciated');
    }
    
    if (homeOwnershipRate > 70) {
      insights.push('High home ownership - stable community, local marketing effective');
    }

    const demographics: DemographicData = {
      zipCode,
      population,
      medianAge,
      medianIncome,
      householdSize,
      educationBachelor: educationRate,
      employmentRate,
      homeOwnership: homeOwnershipRate,
      marketingInsights: insights,
    };

    return { success: true, data: demographics, source: 'census' };
  } catch (error) {
    return { success: false, error: String(error), source: 'census' };
  }
}

// ============================================================================
// PRODUCT HUNT API (FREE GraphQL API)
// ============================================================================

export async function getProductHuntTrending(): Promise<APIResponse<any[]>> {
  try {
    // Product Hunt public feed (no API key needed for basic data)
    const response = await fetch('https://www.producthunt.com/frontend/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: 20) {
              edges {
                node {
                  id
                  name
                  tagline
                  votesCount
                  commentsCount
                  website
                  topics {
                    edges {
                      node {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    });

    const data = await response.json();
    
    const products = data.data?.posts?.edges?.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      tagline: edge.node.tagline,
      votes: edge.node.votesCount,
      comments: edge.node.commentsCount,
      website: edge.node.website,
      topics: edge.node.topics?.edges?.map((t: any) => t.node.name) || [],
    })) || [];

    return { success: true, data: products, source: 'producthunt' };
  } catch (error) {
    return { success: false, error: String(error), source: 'producthunt' };
  }
}

// ============================================================================
// TWITTER/X API (Free tier: 1500 tweets/month read)
// ============================================================================

export async function searchTwitter(query: string): Promise<APIResponse<any[]>> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return { success: false, error: 'Twitter API not configured', source: 'twitter' };
  }

  try {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: '20',
      'tweet.fields': 'created_at,public_metrics,author_id',
    });

    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      {
        headers: { 'Authorization': `Bearer ${bearerToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    
    const tweets = data.data?.map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
    })) || [];

    return { success: true, data: tweets, source: 'twitter' };
  } catch (error) {
    return { success: false, error: String(error), source: 'twitter' };
  }
}

// ============================================================================
// QUORA (Web scraping - no official API, use carefully)
// ============================================================================

export async function searchQuoraQuestions(query: string): Promise<APIResponse<any[]>> {
  try {
    // Quora doesn't have a public API, so we return search suggestions
    // In production, you'd want to use a service like SerpAPI
    return {
      success: true,
      data: [],
      source: 'quora',
      error: 'Quora requires manual search - no public API available',
    };
  } catch (error) {
    return { success: false, error: String(error), source: 'quora' };
  }
}

// ============================================================================
// GOOGLE TRENDS (Unofficial API via trends.google.com)
// ============================================================================

export async function getGoogleTrends(keyword: string): Promise<APIResponse<TrendData>> {
  try {
    // Google Trends doesn't have official API
    // For production, use pytrends (Python) or a third-party service
    // Here we return a structured placeholder
    return {
      success: true,
      data: {
        keyword,
        interest: 0,
        relatedQueries: [],
        risingQueries: [],
      },
      source: 'google-trends',
      error: 'Google Trends requires pytrends or SerpAPI for full data',
    };
  } catch (error) {
    return { success: false, error: String(error), source: 'google-trends' };
  }
}

// ============================================================================
// CLEARBIT (FREE tier - 50 API calls/month for company data)
// ============================================================================

export async function getCompanyInfo(domain: string): Promise<APIResponse<any>> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Clearbit not configured', source: 'clearbit' };
  }

  try {
    const response = await fetch(
      `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Clearbit error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        name: data.name,
        description: data.description,
        industry: data.category?.industry,
        employees: data.metrics?.employees,
        revenue: data.metrics?.estimatedAnnualRevenue,
        location: data.location,
        socialProfiles: {
          twitter: data.twitter?.handle,
          linkedin: data.linkedin?.handle,
          facebook: data.facebook?.handle,
        },
        technologies: data.tech || [],
      },
      source: 'clearbit',
    };
  } catch (error) {
    return { success: false, error: String(error), source: 'clearbit' };
  }
}

// ============================================================================
// HUNTER.IO (FREE tier - 25 searches/month for email finding)
// ============================================================================

export async function findEmails(domain: string): Promise<APIResponse<any>> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Hunter.io not configured', source: 'hunter' };
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`
    );

    const data = await response.json();
    
    return {
      success: true,
      data: {
        domain: data.data?.domain,
        emails: data.data?.emails?.map((e: any) => ({
          email: e.value,
          type: e.type,
          confidence: e.confidence,
          firstName: e.first_name,
          lastName: e.last_name,
          position: e.position,
        })) || [],
        organization: data.data?.organization,
      },
      source: 'hunter',
    };
  } catch (error) {
    return { success: false, error: String(error), source: 'hunter' };
  }
}

// ============================================================================
// UNSPLASH (FREE - 50 requests/hour)
// ============================================================================

export async function searchImages(query: string, count: number = 10): Promise<APIResponse<any[]>> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return { success: false, error: 'Unsplash not configured', source: 'unsplash' };
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}`,
      {
        headers: { 'Authorization': `Client-ID ${accessKey}` },
      }
    );

    const data = await response.json();
    
    const images = data.results?.map((img: any) => ({
      id: img.id,
      url: img.urls.regular,
      thumbnail: img.urls.thumb,
      description: img.description || img.alt_description,
      photographer: img.user.name,
      photographerUrl: img.user.links.html,
      downloadUrl: img.links.download,
    })) || [];

    return { success: true, data: images, source: 'unsplash' };
  } catch (error) {
    return { success: false, error: String(error), source: 'unsplash' };
  }
}

// ============================================================================
// PEXELS (FREE - 200 requests/hour)
// ============================================================================

export async function searchPexels(query: string, count: number = 10): Promise<APIResponse<any[]>> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Pexels not configured', source: 'pexels' };
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`,
      {
        headers: { 'Authorization': apiKey },
      }
    );

    const data = await response.json();
    
    const images = data.photos?.map((img: any) => ({
      id: img.id,
      url: img.src.large,
      thumbnail: img.src.medium,
      photographer: img.photographer,
      photographerUrl: img.photographer_url,
      alt: img.alt,
    })) || [];

    return { success: true, data: images, source: 'pexels' };
  } catch (error) {
    return { success: false, error: String(error), source: 'pexels' };
  }
}

// ============================================================================
// COMBINED MARKET RESEARCH
// ============================================================================

export async function comprehensiveMarketResearch(
  keywords: string[],
  options: {
    includeReddit?: boolean;
    includeHN?: boolean;
    includeNews?: boolean;
    includeTwitter?: boolean;
    subreddits?: string[];
  } = {}
): Promise<APIResponse<{
  opportunities: MarketOpportunity[];
  news: NewsArticle[];
  trends: any[];
  summary: string;
}>> {
  try {
    const results = {
      opportunities: [] as MarketOpportunity[],
      news: [] as NewsArticle[],
      trends: [] as any[],
      summary: '',
    };

    // Reddit
    if (options.includeReddit !== false) {
      const subreddits = options.subreddits || ['Entrepreneur', 'smallbusiness', 'startups'];
      const redditResult = await findRedditOpportunities(keywords, subreddits);
      if (redditResult.success && redditResult.data) {
        results.opportunities.push(...redditResult.data);
      }
    }

    // Hacker News
    if (options.includeHN !== false) {
      const hnResult = await findHNOpportunities(keywords);
      if (hnResult.success && hnResult.data) {
        results.opportunities.push(...hnResult.data);
      }
    }

    // News
    if (options.includeNews !== false) {
      const newsResult = await searchNewsAPI(keywords.join(' OR '));
      if (newsResult.success && newsResult.data) {
        results.news = newsResult.data.slice(0, 10);
      }
    }

    // Sort opportunities by relevance
    results.opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
    results.opportunities = results.opportunities.slice(0, 30);

    // Generate summary
    results.summary = `Found ${results.opportunities.length} marketing opportunities and ${results.news.length} relevant news articles for keywords: ${keywords.join(', ')}`;

    return { success: true, data: results, source: 'combined' };
  } catch (error) {
    return { success: false, error: String(error), source: 'combined' };
  }
}

// ============================================================================
// NICHE RECOMMENDATION ENGINE
// ============================================================================

interface NicheRecommendation {
  platforms: string[];
  subreddits: string[];
  facebookGroupTypes: string[];
  contentTypes: string[];
  bestPostingTimes: string[];
  estimatedReach: string;
  competitionLevel: string;
}

export function getNicheRecommendations(
  nicheSlug: string,
  businessDescription: string
): NicheRecommendation {
  // Niche-specific recommendations
  const recommendations: Record<string, NicheRecommendation> = {
    'crochet': {
      platforms: ['facebook-groups', 'pinterest', 'instagram', 'reddit', 'youtube'],
      subreddits: ['crochet', 'Brochet', 'crochetpatterns', 'Amigurumi', 'YarnAddicts'],
      facebookGroupTypes: ['Pattern sharing', 'Beginner help', 'Yarn stash', 'Amigurumi', 'Crochet business'],
      contentTypes: ['tutorials', 'patterns', 'WIP photos', 'finished projects', 'tips'],
      bestPostingTimes: ['Evening (7-9pm)', 'Weekend mornings', 'Lunch breaks'],
      estimatedReach: '5M+ crocheters on Facebook alone',
      competitionLevel: 'Medium - many free patterns, differentiate on quality',
    },
    'scrapbooking': {
      platforms: ['facebook-groups', 'pinterest', 'instagram', 'youtube'],
      subreddits: ['scrapbooking', 'crafts', 'papercrafts', 'journaling'],
      facebookGroupTypes: ['Scrapbook techniques', 'Memory keeping', 'Paper crafts', 'Cricut/Silhouette'],
      contentTypes: ['layouts', 'tutorials', 'supply reviews', 'challenges', 'before/after'],
      bestPostingTimes: ['Evening (6-9pm)', 'Sunday afternoons'],
      estimatedReach: '3M+ scrapbookers on Pinterest',
      competitionLevel: 'Medium-Low - opportunity for digital tools',
    },
    'whiskey-bourbon': {
      platforms: ['facebook-groups', 'reddit', 'instagram'],
      subreddits: ['bourbon', 'whiskey', 'Scotch', 'WhiskeyTribe', 'worldwhisky'],
      facebookGroupTypes: ['Bourbon collectors', 'Whiskey reviews', 'Trading groups', 'Brand-specific'],
      contentTypes: ['reviews', 'collection photos', 'tasting notes', 'hunting finds'],
      bestPostingTimes: ['Evening (7-10pm)', 'Friday nights', 'Weekend afternoons'],
      estimatedReach: '500K+ serious collectors',
      competitionLevel: 'Low for tracking apps - high for retail',
    },
    'sports-cards': {
      platforms: ['facebook-groups', 'reddit', 'instagram', 'twitter'],
      subreddits: ['baseballcards', 'basketballcards', 'footballcards', 'hockeycards', 'tradingcardcommunity'],
      facebookGroupTypes: ['Trading', 'Grading', 'Breaks', 'Investment', 'Vintage'],
      contentTypes: ['pulls', 'PC showcase', 'investment advice', 'grading results', 'market analysis'],
      bestPostingTimes: ['Evening', 'During games', 'Card show days'],
      estimatedReach: '2M+ active collectors',
      competitionLevel: 'High for marketplace, Medium for tracking',
    },
    'saas': {
      platforms: ['linkedin', 'twitter', 'reddit', 'producthunt', 'hackernews'],
      subreddits: ['SaaS', 'startups', 'Entrepreneur', 'indiehackers', 'webdev'],
      facebookGroupTypes: ['SaaS founders', 'Startup communities', 'No-code builders'],
      contentTypes: ['case studies', 'metrics sharing', 'lessons learned', 'product launches'],
      bestPostingTimes: ['Tuesday-Thursday mornings', 'Lunch time'],
      estimatedReach: '10M+ on LinkedIn',
      competitionLevel: 'Very High - differentiate on niche',
    },
  };

  // Default if niche not found
  const defaultRec: NicheRecommendation = {
    platforms: ['facebook-groups', 'reddit', 'linkedin', 'instagram'],
    subreddits: ['Entrepreneur', 'smallbusiness'],
    facebookGroupTypes: ['Industry-specific', 'Local business', 'Professional networking'],
    contentTypes: ['value content', 'tips', 'case studies', 'engagement posts'],
    bestPostingTimes: ['Weekday mornings', 'Lunch breaks', 'Early evening'],
    estimatedReach: 'Varies by niche',
    competitionLevel: 'Research needed',
  };

  return recommendations[nicheSlug] || defaultRec;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const FreeAPIs = {
  // Reddit
  searchReddit,
  getSubredditPosts,
  findRedditOpportunities,
  
  // Hacker News
  getHNTopStories,
  searchHN,
  findHNOpportunities,
  
  // News
  searchNewsAPI,
  searchGNews,
  searchMediaStack,
  
  // Demographics
  getCensusDemographics,
  
  // Social
  getProductHuntTrending,
  searchTwitter,
  searchQuoraQuestions,
  
  // Research
  getGoogleTrends,
  getCompanyInfo,
  findEmails,
  
  // Media
  searchImages,
  searchPexels,
  
  // Combined
  comprehensiveMarketResearch,
  getNicheRecommendations,
};

export default FreeAPIs;
