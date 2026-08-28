// ============================================================================
// CR AUDIOVIZ AI - CAMPAIGN ENGINE
// Create, manage, and execute marketing campaigns
// Generated: December 18, 2025
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";

// ============================================================================
// TYPES
// ============================================================================

export interface Campaign {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  businessNicheId?: string;
  productName: string;
  productUrl?: string;
  productDescription: string;
  campaignType: 'awareness' | 'launch' | 'ongoing' | 'promotion' | 'drip';
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  startDate?: string;
  endDate?: string;
  targetPlatforms: string[];
  targetGroups?: string[];
  goals?: CampaignGoals;
  settings?: CampaignSettings;
  schedule?: CampaignSchedule;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignGoals {
  impressions?: number;
  engagements?: number;
  clicks?: number;
  signups?: number;
  conversions?: number;
  revenue?: number;
}

export interface CampaignSettings {
  postingFrequency: 'daily' | 'every-other-day' | 'twice-weekly' | 'weekly';
  maxPostsPerDay: number;
  rotateTemplates: boolean;
  includeCrossSell: boolean;
  aiGenerateContent: boolean;
  autoSchedule: boolean;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  recurringPattern?: 'hourly' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  preferredTimes?: string[]; // ['09:00', '14:00', '19:00']
  preferredDays?: string[]; // ['monday', 'wednesday', 'friday']
  timezone?: string;
}

export interface CampaignPost {
  id?: string;
  campaignId: string;
  groupId?: string;
  platformSlug: string;
  contentType: 'curiosity' | 'value' | 'announcement' | 'engagement' | 'cross-sell';
  title?: string;
  body: string;
  mediaUrls?: string[];
  hashtags?: string[];
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduledFor?: string;
  postedAt?: string;
  postUrl?: string;
  engagementData?: {
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
  };
  aiGenerated: boolean;
  aiModel?: string;
}

export interface PostTemplate {
  id?: string;
  name: string;
  category: 'curiosity' | 'value' | 'engagement' | 'announcement' | 'cross-sell';
  platformSlug?: string;
  nicheId?: string;
  templateText: string;
  placeholders: Record<string, string>;
  performanceScore?: number;
  timesUsed?: number;
}

export interface NicheConfig {
  id: string;
  name: string;
  slug: string;
  keywords: string[];
  recommendedPlatforms: string[];
  recommendedSubreddits: string[];
  facebookGroupTypes: string[];
  postingStrategy: string;
  contentTypes: string[];
}

// ============================================================================
// CAMPAIGN TEMPLATES LIBRARY
// ============================================================================

export const CAMPAIGN_TEMPLATES: PostTemplate[] = [
  // CURIOSITY POSTS (The Henderson Method)
  {
    name: 'Basic Curiosity',
    category: 'curiosity',
    templateText: `Has anyone tried {{product_name}} for {{use_case}}? I'm getting ready to test it out and wanted any feedback. If you use something different, let me know what so I can compare!`,
    placeholders: { product_name: 'the app', use_case: 'this task' },
  },
  {
    name: 'Tool Comparison Request',
    category: 'curiosity',
    templateText: `Quick question - what do you all use for {{task}}? I've been researching options and wanted real user feedback before I commit. Any favorites or ones to avoid?`,
    placeholders: { task: 'managing your collection' },
  },
  {
    name: 'Specific Problem',
    category: 'curiosity',
    templateText: `Building out my toolkit and wondering about {{category}}. I have {{specific_problem}}. What's everyone here using? Any hidden gems I should know about?`,
    placeholders: { category: 'organization tools', specific_problem: 'too many items to track' },
  },
  {
    name: 'Soft Recommendation Ask',
    category: 'curiosity',
    templateText: `Looking for recommendations! I need something that {{requirement}}. Budget is {{budget}}. What would you suggest? Currently looking at {{product_name}} but open to alternatives.`,
    placeholders: { requirement: 'works on mobile', budget: 'free or cheap', product_name: 'a few options' },
  },
  {
    name: 'Experience Sharing Request',
    category: 'curiosity',
    templateText: `Curious about everyone's experience with {{category}} apps/tools. What's working for you? What frustrates you about the current options? Looking to make a decision soon.`,
    placeholders: { category: 'collection tracking' },
  },

  // VALUE POSTS
  {
    name: 'Quick Tip',
    category: 'value',
    templateText: `💡 Quick tip that helped me: {{tip}}

This saved me {{benefit}}. Hope it helps someone else!`,
    placeholders: { tip: 'Organize by category first', benefit: 'hours of searching' },
  },
  {
    name: 'How I Solved Problem',
    category: 'value',
    templateText: `Had a problem with {{problem}} and finally figured it out. Here's what worked:

{{solution}}

Anyone else run into this?`,
    placeholders: { problem: 'tracking everything', solution: 'Step 1... Step 2... Step 3...' },
  },
  {
    name: 'Resource Sharing',
    category: 'value',
    templateText: `Found this helpful resource for {{topic}}: {{resource}}

Thought others here might find it useful. Has anyone used it before?`,
    placeholders: { topic: 'beginners', resource: '[describe resource]' },
  },

  // ENGAGEMENT POSTS
  {
    name: 'Poll/Question',
    category: 'engagement',
    templateText: `Quick poll: {{question}}

A) {{option_a}}
B) {{option_b}}
C) {{option_c}}

Drop your answer below! 👇`,
    placeholders: { question: 'How do you organize?', option_a: 'Spreadsheet', option_b: 'App', option_c: 'Physical system' },
  },
  {
    name: 'Show and Tell Request',
    category: 'engagement',
    templateText: `Would love to see everyone's {{thing}}! Drop a photo or description below.

I'll share mine too: {{your_example}}`,
    placeholders: { thing: 'setup', your_example: '[describe yours]' },
  },

  // ANNOUNCEMENT POSTS (For Official Pages)
  {
    name: 'New Feature',
    category: 'announcement',
    templateText: `🚀 NEW: {{feature_name}} is now live!

Here's what you can do:
{{feature_benefits}}

Try it free: {{link}}`,
    placeholders: { feature_name: 'Feature Name', feature_benefits: '• Benefit 1\n• Benefit 2', link: 'URL' },
  },
  {
    name: 'User Success Story',
    category: 'announcement',
    templateText: `Love seeing how {{user_type}} uses {{product_name}}! 

{{quote_or_story}}

What would YOU create? 👇`,
    placeholders: { user_type: 'our users', product_name: 'the tool', quote_or_story: '[Story here]' },
  },

  // CROSS-SELL POSTS
  {
    name: 'Related Tool Mention',
    category: 'cross-sell',
    templateText: `If you're using {{current_tool}}, you might also like {{related_tool}}. 

They work great together for {{combined_benefit}}.

Both free to try: {{link}}`,
    placeholders: { current_tool: 'Tool A', related_tool: 'Tool B', combined_benefit: 'complete workflow', link: 'URL' },
  },
];

// ============================================================================
// NICHE CONFIGURATIONS
// ============================================================================

export const NICHE_CONFIGS: Record<string, NicheConfig> = {
  'crochet': {
    id: 'crochet',
    name: 'Crochet',
    slug: 'crochet',
    keywords: ['crochet', 'yarn', 'pattern', 'hook', 'amigurumi', 'afghan', 'blanket', 'granny square'],
    recommendedPlatforms: ['facebook-groups', 'pinterest', 'instagram', 'reddit', 'youtube', 'ravelry'],
    recommendedSubreddits: ['crochet', 'Brochet', 'crochetpatterns', 'Amigurumi', 'YarnAddicts'],
    facebookGroupTypes: [
      'Pattern sharing groups',
      'Beginner crochet help',
      'Yarn stash/destash',
      'Amigurumi makers',
      'Crochet business owners',
      'CAL (Crochet Along) groups',
    ],
    postingStrategy: 'Share WIP photos, ask for pattern help, give tips. Pinterest for patterns. Instagram for finished projects.',
    contentTypes: ['tutorials', 'patterns', 'WIP photos', 'finished projects', 'yarn reviews', 'tips'],
  },
  'scrapbooking': {
    id: 'scrapbooking',
    name: 'Scrapbooking',
    slug: 'scrapbooking',
    keywords: ['scrapbook', 'paper craft', 'memory keeping', 'album', 'embellishment', 'cricut', 'silhouette'],
    recommendedPlatforms: ['facebook-groups', 'pinterest', 'instagram', 'youtube'],
    recommendedSubreddits: ['scrapbooking', 'crafts', 'papercrafts', 'journaling', 'Cricut'],
    facebookGroupTypes: [
      'Scrapbooking techniques',
      'Memory keeping',
      'Paper crafts',
      'Cricut/Silhouette users',
      'Junk journals',
      'Card making',
    ],
    postingStrategy: 'Share layout photos, ask for technique tips. Pinterest is HUGE here. Show before/after.',
    contentTypes: ['layouts', 'tutorials', 'supply reviews', 'challenges', 'before/after', 'inspiration'],
  },
  'whiskey-bourbon': {
    id: 'whiskey-bourbon',
    name: 'Whiskey & Bourbon',
    slug: 'whiskey-bourbon',
    keywords: ['whiskey', 'bourbon', 'scotch', 'rye', 'collector', 'tasting', 'distillery', 'barrel'],
    recommendedPlatforms: ['facebook-groups', 'reddit', 'instagram'],
    recommendedSubreddits: ['bourbon', 'whiskey', 'Scotch', 'WhiskeyTribe', 'worldwhisky'],
    facebookGroupTypes: [
      'Bourbon collectors',
      'Whiskey reviews',
      'Trading/selling groups',
      'Brand-specific (Buffalo Trace, etc.)',
      'Hunting groups',
    ],
    postingStrategy: 'Share collection photos, ask for recommendations, discuss finds. Evening/weekend posting.',
    contentTypes: ['reviews', 'collection photos', 'tasting notes', 'hunting finds', 'bottle recommendations'],
  },
  'sports-cards': {
    id: 'sports-cards',
    name: 'Sports Cards',
    slug: 'sports-cards',
    keywords: ['trading cards', 'baseball cards', 'basketball cards', 'football cards', 'grading', 'PSA', 'BGS'],
    recommendedPlatforms: ['facebook-groups', 'reddit', 'instagram', 'twitter', 'ebay'],
    recommendedSubreddits: ['baseballcards', 'basketballcards', 'footballcards', 'hockeycards', 'tradingcardcommunity'],
    facebookGroupTypes: [
      'Trading groups',
      'Grading discussions',
      'Break groups',
      'Investment/flip groups',
      'Vintage collectors',
      'Sport-specific groups',
    ],
    postingStrategy: 'Share pulls, ask about grading, discuss market. Post during games for engagement.',
    contentTypes: ['pulls', 'PC showcase', 'investment advice', 'grading results', 'market analysis'],
  },
  'saas': {
    id: 'saas',
    name: 'SaaS & Software',
    slug: 'saas',
    keywords: ['saas', 'software', 'startup', 'app', 'product', 'launch', 'MRR', 'ARR'],
    recommendedPlatforms: ['linkedin', 'twitter', 'reddit', 'producthunt', 'hackernews', 'indiehackers'],
    recommendedSubreddits: ['SaaS', 'startups', 'Entrepreneur', 'indiehackers', 'webdev', 'programming'],
    facebookGroupTypes: [
      'SaaS founders',
      'Startup communities',
      'No-code/low-code builders',
      'Product managers',
      'Growth hackers',
    ],
    postingStrategy: 'Share metrics, lessons learned. Product Hunt for launches. LinkedIn for B2B.',
    contentTypes: ['case studies', 'metrics sharing', 'lessons learned', 'product launches', 'AMA'],
  },
};

// ============================================================================
// CAMPAIGN MANAGER CLASS
// ============================================================================

export class CampaignManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      supabaseUrl(),
      secretKey()
    );
  }

  // ============================================================================
  // CAMPAIGN CRUD
  // ============================================================================

  async createCampaign(campaign: Campaign): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .insert({
          user_id: campaign.userId,
          name: campaign.name,
          description: campaign.description,
          business_niche_id: campaign.businessNicheId,
          product_name: campaign.productName,
          product_url: campaign.productUrl,
          product_description: campaign.productDescription,
          campaign_type: campaign.campaignType,
          status: campaign.status || 'draft',
          budget: campaign.budget || 0,
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          target_platforms: campaign.targetPlatforms,
          target_groups: campaign.targetGroups,
          goals: campaign.goals,
          settings: campaign.settings,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.mapCampaignFromDB(data) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getCampaign(id: string): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data: this.mapCampaignFromDB(data) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getUserCampaigns(userId: string): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data.map(this.mapCampaignFromDB) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<{ success: boolean; data?: Campaign; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .update({
          name: updates.name,
          description: updates.description,
          product_name: updates.productName,
          product_url: updates.productUrl,
          product_description: updates.productDescription,
          campaign_type: updates.campaignType,
          status: updates.status,
          budget: updates.budget,
          start_date: updates.startDate,
          end_date: updates.endDate,
          target_platforms: updates.targetPlatforms,
          target_groups: updates.targetGroups,
          goals: updates.goals,
          settings: updates.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.mapCampaignFromDB(data) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // CAMPAIGN POSTS
  // ============================================================================

  async createPost(post: CampaignPost): Promise<{ success: boolean; data?: CampaignPost; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaign_posts')
        .insert({
          campaign_id: post.campaignId,
          group_id: post.groupId,
          platform_slug: post.platformSlug,
          content_type: post.contentType,
          title: post.title,
          body: post.body,
          media_urls: post.mediaUrls,
          hashtags: post.hashtags,
          status: post.status || 'draft',
          scheduled_for: post.scheduledFor,
          ai_generated: post.aiGenerated,
          ai_model: post.aiModel,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.mapPostFromDB(data) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getCampaignPosts(campaignId: string): Promise<{ success: boolean; data?: CampaignPost[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      return { success: true, data: data.map(this.mapPostFromDB) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updatePostStatus(
    postId: string, 
    status: 'draft' | 'scheduled' | 'posted' | 'failed',
    postUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { status };
      if (status === 'posted') {
        updateData.posted_at = new Date().toISOString();
        if (postUrl) updateData.post_url = postUrl;
      }

      const { error } = await this.supabase
        .from('campaign_posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // CONTENT GENERATION
  // ============================================================================

  async generatePosts(
    campaign: Campaign,
    options: {
      count: number;
      types: ('curiosity' | 'value' | 'engagement')[];
      useAI: boolean;
    }
  ): Promise<{ success: boolean; data?: CampaignPost[]; error?: string }> {
    try {
      const posts: CampaignPost[] = [];
      const nicheConfig = NICHE_CONFIGS[campaign.businessNicheId || ''] || NICHE_CONFIGS['saas'];

      for (let i = 0; i < options.count; i++) {
        const contentType = options.types[i % options.types.length];
        
        // Get appropriate template
        const templates = CAMPAIGN_TEMPLATES.filter(t => t.category === contentType);
        const template = templates[Math.floor(Math.random() * templates.length)];

        // Fill in placeholders
        let body = template.templateText;
        body = body.replace('{{product_name}}', campaign.productName);
        body = body.replace('{{use_case}}', campaign.productDescription.slice(0, 50));
        body = body.replace('{{task}}', campaign.productDescription.slice(0, 30));
        body = body.replace('{{category}}', nicheConfig.name.toLowerCase());
        body = body.replace('{{link}}', campaign.productUrl || 'craudiovizai.com');

        // If AI generation is enabled and we have credits, enhance the post
        if (options.useAI) {
          // TODO: Call AI to enhance/customize the post
          // For now, we use the template as-is
        }

        posts.push({
          campaignId: campaign.id!,
          platformSlug: campaign.targetPlatforms[i % campaign.targetPlatforms.length],
          contentType,
          body,
          status: 'draft',
          aiGenerated: options.useAI,
          aiModel: options.useAI ? 'template-enhanced' : undefined,
        });
      }

      return { success: true, data: posts };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // SCHEDULING
  // ============================================================================

  async schedulePost(
    postId: string,
    scheduledFor: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('campaign_posts')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getScheduledPosts(
    before?: Date,
    after?: Date
  ): Promise<{ success: boolean; data?: CampaignPost[]; error?: string }> {
    try {
      let query = this.supabase
        .from('campaign_posts')
        .select('*, campaigns(*)')
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true });

      if (before) {
        query = query.lte('scheduled_for', before.toISOString());
      }
      if (after) {
        query = query.gte('scheduled_for', after.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data.map(this.mapPostFromDB) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getDuePostsForExecution(): Promise<{ success: boolean; data?: CampaignPost[]; error?: string }> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('campaign_posts')
        .select('*, campaigns(*)')
        .eq('status', 'scheduled')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      return { success: true, data: data.map(this.mapPostFromDB) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async recordEngagement(
    postId: string,
    engagement: { likes?: number; comments?: number; shares?: number; clicks?: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('campaign_posts')
        .update({ engagement_data: engagement })
        .eq('id', postId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getCampaignAnalytics(campaignId: string): Promise<{
    success: boolean;
    data?: {
      totalPosts: number;
      postedCount: number;
      scheduledCount: number;
      totalEngagement: { likes: number; comments: number; shares: number; clicks: number };
      topPerformingPosts: CampaignPost[];
      platformBreakdown: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      const { data: posts, error } = await this.supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const totalEngagement = { likes: 0, comments: 0, shares: 0, clicks: 0 };
      const platformBreakdown: Record<string, number> = {};

      for (const post of posts) {
        if (post.engagement_data) {
          totalEngagement.likes += post.engagement_data.likes || 0;
          totalEngagement.comments += post.engagement_data.comments || 0;
          totalEngagement.shares += post.engagement_data.shares || 0;
          totalEngagement.clicks += post.engagement_data.clicks || 0;
        }
        platformBreakdown[post.platform_slug] = (platformBreakdown[post.platform_slug] || 0) + 1;
      }

      // Sort by engagement for top performing
      const sortedPosts = posts
        .filter(p => p.engagement_data)
        .sort((a, b) => {
          const aScore = (a.engagement_data?.likes || 0) + (a.engagement_data?.comments || 0) * 2;
          const bScore = (b.engagement_data?.likes || 0) + (b.engagement_data?.comments || 0) * 2;
          return bScore - aScore;
        })
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalPosts: posts.length,
          postedCount: posts.filter(p => p.status === 'posted').length,
          scheduledCount: posts.filter(p => p.status === 'scheduled').length,
          totalEngagement,
          topPerformingPosts: sortedPosts.map(this.mapPostFromDB),
          platformBreakdown,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapCampaignFromDB(row: any): Campaign {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      businessNicheId: row.business_niche_id,
      productName: row.product_name,
      productUrl: row.product_url,
      productDescription: row.product_description,
      campaignType: row.campaign_type,
      status: row.status,
      budget: row.budget,
      startDate: row.start_date,
      endDate: row.end_date,
      targetPlatforms: row.target_platforms || [],
      targetGroups: row.target_groups || [],
      goals: row.goals,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPostFromDB(row: any): CampaignPost {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      groupId: row.group_id,
      platformSlug: row.platform_slug,
      contentType: row.content_type,
      title: row.title,
      body: row.body,
      mediaUrls: row.media_urls,
      hashtags: row.hashtags,
      status: row.status,
      scheduledFor: row.scheduled_for,
      postedAt: row.posted_at,
      postUrl: row.post_url,
      engagementData: row.engagement_data,
      aiGenerated: row.ai_generated,
      aiModel: row.ai_model,
    };
  }
}

// ============================================================================
// NICHE RECOMMENDATION ENGINE
// ============================================================================

export function getMarketingRecommendations(
  businessDescription: string,
  budget: number
): {
  recommendedNiche: NicheConfig | null;
  platforms: { name: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  groupTypes: string[];
  contentStrategy: string;
  postingSchedule: string;
  estimatedReach: string;
} {
  // Simple keyword matching to find best niche
  const description = businessDescription.toLowerCase();
  let bestNiche: NicheConfig | null = null;
  let bestScore = 0;

  for (const [slug, config] of Object.entries(NICHE_CONFIGS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestNiche = config;
    }
  }

  // Default to SaaS if no match
  if (!bestNiche) {
    bestNiche = NICHE_CONFIGS['saas'];
  }

  // Build platform recommendations
  const platforms = bestNiche.recommendedPlatforms.map((platform, index) => ({
    name: platform,
    priority: index < 2 ? 'high' as const : index < 4 ? 'medium' as const : 'low' as const,
    reason: getPlatformReason(platform, bestNiche!),
  }));

  // Adjust for budget
  let contentStrategy = bestNiche.postingStrategy;
  let postingSchedule = '3-5 posts per week across platforms';
  
  if (budget === 0) {
    contentStrategy = `FREE strategy: ${bestNiche.postingStrategy} Focus on organic reach and community engagement.`;
    postingSchedule = 'Start with 1-2 posts per day, scaling based on response. All organic, no paid promotion.';
  } else if (budget < 500) {
    postingSchedule = '5-7 posts per week. Consider boosting top performers.';
  }

  return {
    recommendedNiche: bestNiche,
    platforms,
    groupTypes: bestNiche.facebookGroupTypes,
    contentStrategy,
    postingSchedule,
    estimatedReach: `${bestNiche.name} community: Active across ${bestNiche.recommendedPlatforms.length} platforms`,
  };
}

function getPlatformReason(platform: string, niche: NicheConfig): string {
  const reasons: Record<string, string> = {
    'facebook-groups': `Primary community hub for ${niche.name.toLowerCase()} enthusiasts`,
    'reddit': `Active subreddits: ${niche.recommendedSubreddits.slice(0, 3).join(', ')}`,
    'pinterest': 'Visual discovery - high intent traffic',
    'instagram': 'Visual content performs well, Stories for engagement',
    'linkedin': 'B2B connections and professional credibility',
    'twitter': 'Real-time conversations and industry news',
    'youtube': 'Tutorial content, long-term SEO value',
    'producthunt': 'Product launches and early adopter community',
    'hackernews': 'Tech-savvy audience, high-quality traffic',
  };
  return reasons[platform] || 'Relevant platform for your niche';
}

// ============================================================================
// EXPORT
// ============================================================================

export const campaignEngine = {
  CampaignManager,
  CAMPAIGN_TEMPLATES,
  NICHE_CONFIGS,
  getMarketingRecommendations,
};

export default campaignEngine;
