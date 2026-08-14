-- ============================================================================
-- CR AUDIOVIZ AI - MARKETING COMMAND CENTER DATABASE SCHEMA
-- Supabase PostgreSQL Schema
-- Generated: December 18, 2025
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    company_name TEXT,
    subscription_tier TEXT DEFAULT 'starter', -- starter, pro, enterprise
    credits_balance INTEGER DEFAULT 100,
    credits_used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUSINESS & NICHE MANAGEMENT
-- ============================================================================

-- Business types/niches (what kind of business the user has)
CREATE TABLE IF NOT EXISTS business_niches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES business_niches(id),
    icon TEXT,
    keywords TEXT[], -- For matching
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with niches
INSERT INTO business_niches (name, slug, description, icon, keywords) VALUES
-- Alcohol & Beverages
('Whiskey & Bourbon', 'whiskey-bourbon', 'Whiskey and bourbon collectors and enthusiasts', 'wine', ARRAY['whiskey', 'bourbon', 'scotch', 'rye', 'collector', 'distillery']),
('Wine', 'wine', 'Wine collectors and enthusiasts', 'wine', ARRAY['wine', 'vineyard', 'sommelier', 'cellar', 'vintage']),
('Craft Beer', 'craft-beer', 'Craft beer enthusiasts and brewers', 'beer', ARRAY['beer', 'craft', 'brewery', 'homebrew', 'IPA']),
('Cocktails & Bartending', 'cocktails', 'Mixologists and cocktail enthusiasts', 'martini', ARRAY['cocktail', 'mixology', 'bartender', 'spirits']),

-- Collecting
('Sports Cards', 'sports-cards', 'Sports card collectors and traders', 'trophy', ARRAY['baseball', 'basketball', 'football', 'hockey', 'cards', 'trading']),
('Pokemon Cards', 'pokemon-cards', 'Pokemon TCG collectors', 'star', ARRAY['pokemon', 'tcg', 'pikachu', 'collector', 'grading']),
('Trading Cards', 'trading-cards', 'General trading card collectors', 'layers', ARRAY['mtg', 'magic', 'yugioh', 'cards', 'tcg']),
('Stamps & Coins', 'stamps-coins', 'Philatelists and numismatists', 'stamp', ARRAY['stamp', 'coin', 'philately', 'numismatic', 'collector']),
('Comics', 'comics', 'Comic book collectors', 'book', ARRAY['comic', 'marvel', 'dc', 'manga', 'graphic novel']),

-- Crafts
('Crochet', 'crochet', 'Crocheters and yarn crafters', 'scissors', ARRAY['crochet', 'yarn', 'amigurumi', 'pattern', 'hook']),
('Knitting', 'knitting', 'Knitters and fiber artists', 'scissors', ARRAY['knit', 'yarn', 'wool', 'pattern', 'needles']),
('Scrapbooking', 'scrapbooking', 'Scrapbookers and memory keepers', 'book-open', ARRAY['scrapbook', 'paper', 'memories', 'album', 'craft']),
('Quilting', 'quilting', 'Quilters and fabric artists', 'grid', ARRAY['quilt', 'fabric', 'sewing', 'pattern', 'patchwork']),
('Jewelry Making', 'jewelry', 'Jewelry makers and beaders', 'gem', ARRAY['jewelry', 'beads', 'wire', 'gemstone', 'handmade']),

-- Business
('SaaS & Software', 'saas', 'Software as a service companies', 'code', ARRAY['saas', 'software', 'startup', 'tech', 'app']),
('E-commerce', 'ecommerce', 'Online retail businesses', 'shopping-cart', ARRAY['ecommerce', 'online', 'store', 'retail', 'shop']),
('Consulting', 'consulting', 'Consultants and advisors', 'briefcase', ARRAY['consultant', 'advisor', 'expert', 'coaching']),
('Freelancing', 'freelancing', 'Freelancers and independents', 'user', ARRAY['freelance', 'independent', 'contractor', 'gig']),
('Local Business', 'local-business', 'Brick and mortar businesses', 'store', ARRAY['local', 'store', 'shop', 'restaurant', 'service']),

-- Creators
('YouTube', 'youtube', 'YouTube content creators', 'youtube', ARRAY['youtube', 'video', 'creator', 'vlog', 'channel']),
('Podcasting', 'podcasting', 'Podcast hosts and producers', 'mic', ARRAY['podcast', 'audio', 'host', 'episode', 'interview']),
('Blogging', 'blogging', 'Bloggers and writers', 'edit', ARRAY['blog', 'writer', 'content', 'article', 'post']),
('Music', 'music', 'Musicians and producers', 'music', ARRAY['music', 'musician', 'producer', 'song', 'artist']),
('Photography', 'photography', 'Photographers and visual artists', 'camera', ARRAY['photo', 'photographer', 'portrait', 'wedding', 'landscape'])

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SOCIAL PLATFORMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    base_url TEXT,
    api_available BOOLEAN DEFAULT false,
    api_free_tier BOOLEAN DEFAULT false,
    api_docs_url TEXT,
    best_for TEXT[], -- ['b2b', 'visual', 'community', 'news']
    posting_strategy TEXT,
    content_types TEXT[], -- ['text', 'image', 'video', 'link']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO social_platforms (name, slug, description, icon, base_url, api_available, api_free_tier, best_for, posting_strategy, content_types) VALUES
('Facebook Groups', 'facebook-groups', 'Community-based marketing in niche groups', 'facebook', 'https://facebook.com', false, false, ARRAY['community', 'trust', 'engagement'], 'Curiosity posts, value-first, no direct sales', ARRAY['text', 'image', 'link']),
('Facebook Page', 'facebook-page', 'Official brand presence', 'facebook', 'https://facebook.com', true, true, ARRAY['brand', 'awareness', 'ads'], 'Brand content, announcements, engagement', ARRAY['text', 'image', 'video', 'link']),
('Instagram', 'instagram', 'Visual content and stories', 'instagram', 'https://instagram.com', true, true, ARRAY['visual', 'lifestyle', 'young'], 'High-quality visuals, reels, stories', ARRAY['image', 'video']),
('LinkedIn', 'linkedin', 'Professional and B2B networking', 'linkedin', 'https://linkedin.com', true, true, ARRAY['b2b', 'professional', 'thought-leadership'], 'Value content, industry insights, networking', ARRAY['text', 'image', 'video', 'link']),
('Twitter/X', 'twitter', 'Real-time conversations and news', 'twitter', 'https://twitter.com', true, true, ARRAY['news', 'tech', 'real-time'], 'Short updates, threads, engagement', ARRAY['text', 'image', 'video', 'link']),
('Reddit', 'reddit', 'Community discussions in subreddits', 'message-circle', 'https://reddit.com', true, true, ARRAY['community', 'niche', 'authentic'], 'Helpful answers, no self-promotion', ARRAY['text', 'image', 'link']),
('Pinterest', 'pinterest', 'Visual discovery and ideas', 'image', 'https://pinterest.com', true, true, ARRAY['visual', 'crafts', 'ideas', 'seo'], 'Vertical images, how-tos, inspiration', ARRAY['image', 'link']),
('TikTok', 'tiktok', 'Short-form video content', 'video', 'https://tiktok.com', true, false, ARRAY['young', 'viral', 'entertainment'], 'Short videos, trends, authentic', ARRAY['video']),
('YouTube', 'youtube', 'Long-form video content', 'youtube', 'https://youtube.com', true, true, ARRAY['tutorials', 'seo', 'education'], 'Tutorials, reviews, how-tos', ARRAY['video']),
('Discord', 'discord', 'Community servers and chat', 'message-square', 'https://discord.com', true, true, ARRAY['community', 'gaming', 'tech'], 'Community building, real-time engagement', ARRAY['text', 'image']),
('Quora', 'quora', 'Q&A platform', 'help-circle', 'https://quora.com', false, false, ARRAY['seo', 'authority', 'long-tail'], 'Answer questions, establish expertise', ARRAY['text']),
('Medium', 'medium', 'Long-form articles', 'file-text', 'https://medium.com', true, true, ARRAY['content', 'thought-leadership'], 'In-depth articles, stories', ARRAY['text', 'image']),
('Substack', 'substack', 'Newsletter platform', 'mail', 'https://substack.com', true, true, ARRAY['newsletter', 'writing', 'subscription'], 'Regular newsletters, exclusive content', ARRAY['text', 'image']),
('Product Hunt', 'producthunt', 'Product launches', 'rocket', 'https://producthunt.com', true, true, ARRAY['launch', 'tech', 'startups'], 'Product launches, community engagement', ARRAY['text', 'image', 'link']),
('Hacker News', 'hackernews', 'Tech community discussion', 'code', 'https://news.ycombinator.com', true, true, ARRAY['tech', 'startups', 'developers'], 'Show HN posts, valuable comments', ARRAY['text', 'link'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- COMMUNITY GROUPS (Facebook Groups, Subreddits, Discord, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES social_platforms(id),
    name TEXT NOT NULL,
    url TEXT,
    member_count INTEGER,
    niche_id UUID REFERENCES business_niches(id),
    activity_level TEXT, -- 'very-active', 'active', 'moderate', 'low'
    rules_summary TEXT,
    allows_promotion BOOLEAN DEFAULT false,
    promotion_rules TEXT,
    best_posting_days TEXT[],
    best_posting_times TEXT[],
    admin_strictness TEXT, -- 'strict', 'moderate', 'relaxed'
    competitor_presence TEXT[], -- competitors active in this group
    notes TEXT,
    added_by UUID REFERENCES profiles(id),
    verified BOOLEAN DEFAULT false,
    last_activity_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast niche lookups
CREATE INDEX IF NOT EXISTS idx_groups_niche ON community_groups(niche_id);
CREATE INDEX IF NOT EXISTS idx_groups_platform ON community_groups(platform_id);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    business_niche_id UUID REFERENCES business_niches(id),
    product_name TEXT, -- What they're marketing
    product_url TEXT,
    product_description TEXT,
    campaign_type TEXT NOT NULL, -- 'awareness', 'launch', 'ongoing', 'promotion'
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    budget DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    target_platforms TEXT[], -- platform slugs
    target_groups UUID[], -- group IDs
    goals JSONB, -- { leads: 100, signups: 50, etc }
    settings JSONB, -- various campaign settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign content/posts
CREATE TABLE IF NOT EXISTS campaign_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    group_id UUID REFERENCES community_groups(id),
    platform_slug TEXT,
    content_type TEXT, -- 'curiosity', 'value', 'announcement', 'engagement'
    title TEXT,
    body TEXT NOT NULL,
    media_urls TEXT[],
    hashtags TEXT[],
    status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
    scheduled_for TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    post_url TEXT, -- URL after posting
    engagement_data JSONB, -- { likes: 0, comments: 0, shares: 0 }
    ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post templates library
CREATE TABLE IF NOT EXISTS post_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT, -- 'curiosity', 'value', 'engagement', 'announcement'
    platform_slug TEXT,
    niche_id UUID REFERENCES business_niches(id),
    template_text TEXT NOT NULL,
    placeholders JSONB, -- { product_name: "Your product", benefit: "key benefit" }
    performance_score DECIMAL(3,2), -- 0.00 to 1.00 based on historical performance
    times_used INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    is_system BOOLEAN DEFAULT true, -- system templates vs user-created
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMPETITOR INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    website TEXT,
    description TEXT,
    niche_id UUID REFERENCES business_niches(id),
    pricing_info TEXT,
    key_features TEXT[],
    weaknesses TEXT[],
    strengths TEXT[],
    mention_count INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    last_mentioned_at TIMESTAMPTZ,
    discovered_via TEXT, -- 'group_mention', 'manual', 'web_research'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    group_id UUID REFERENCES community_groups(id),
    platform_slug TEXT,
    mention_text TEXT,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    context TEXT, -- why they mentioned it
    source_url TEXT,
    mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NEWSLETTERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    niche_id UUID REFERENCES business_niches(id),
    frequency TEXT, -- 'daily', 'weekly', 'biweekly', 'monthly'
    send_day TEXT, -- 'monday', 'tuesday', etc
    send_time TIME,
    subscriber_count INTEGER DEFAULT 0,
    template_id UUID,
    content_sources JSONB, -- RSS feeds, social accounts, etc
    cross_sell_products JSONB, -- javari products to cross-sell
    settings JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced'
    source TEXT, -- 'website', 'import', 'campaign'
    tags TEXT[],
    engagement_score DECIMAL(3,2) DEFAULT 0.50
);

CREATE TABLE IF NOT EXISTS newsletter_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    preview_text TEXT,
    html_content TEXT,
    plain_content TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sent'
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    stats JSONB, -- { sent: 0, opened: 0, clicked: 0, bounced: 0 }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    signups INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    platform_breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    source TEXT NOT NULL, -- 'reddit', 'twitter', 'quora', etc
    source_url TEXT,
    content TEXT,
    relevance_score DECIMAL(3,2), -- 0 to 1
    niche_match TEXT,
    suggested_response TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'reviewed', 'acted', 'skipped'
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FREE API INTEGRATIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT, -- 'social', 'email', 'analytics', 'ai', 'data'
    description TEXT,
    base_url TEXT,
    docs_url TEXT,
    free_tier_limits TEXT,
    requires_api_key BOOLEAN DEFAULT true,
    api_key_env_var TEXT, -- Environment variable name
    status TEXT DEFAULT 'active', -- 'active', 'deprecated', 'unavailable'
    rate_limits JSONB,
    capabilities TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO api_integrations (name, slug, category, description, free_tier_limits, requires_api_key, api_key_env_var, capabilities) VALUES
-- AI APIs
('Groq', 'groq', 'ai', 'Fast LLM inference', 'Unlimited (rate limited)', true, 'GROQ_API_KEY', ARRAY['text-generation', 'chat']),
('Perplexity', 'perplexity', 'ai', 'AI with web search', '5 requests/min', true, 'PERPLEXITY_API_KEY', ARRAY['text-generation', 'web-search']),
('OpenAI', 'openai', 'ai', 'GPT models', 'Pay per use', true, 'OPENAI_API_KEY', ARRAY['text-generation', 'image-generation', 'embeddings']),
('Anthropic Claude', 'anthropic', 'ai', 'Claude models', 'Pay per use', true, 'ANTHROPIC_API_KEY', ARRAY['text-generation', 'analysis']),

-- Social APIs
('Reddit', 'reddit', 'social', 'Reddit public API', 'Unlimited reads', false, null, ARRAY['search', 'posts', 'comments', 'subreddits']),
('Twitter/X', 'twitter', 'social', 'Twitter API v2', '1500 posts/mo free', true, 'TWITTER_BEARER_TOKEN', ARRAY['search', 'post', 'timeline']),
('Hacker News', 'hackernews', 'social', 'HN Firebase API', 'Unlimited', false, null, ARRAY['stories', 'comments', 'search']),

-- Email APIs
('Resend', 'resend', 'email', 'Modern email API', '100 emails/day', true, 'RESEND_API_KEY', ARRAY['send', 'templates', 'tracking']),
('SendGrid', 'sendgrid', 'email', 'Email delivery', '100 emails/day', true, 'SENDGRID_API_KEY', ARRAY['send', 'templates', 'analytics']),

-- Data APIs
('US Census', 'census', 'data', 'Demographics by ZIP', 'Unlimited', false, null, ARRAY['demographics', 'population', 'income']),
('NewsAPI', 'newsapi', 'data', 'News aggregation', '100 requests/day', true, 'NEWSAPI_KEY', ARRAY['headlines', 'search', 'sources']),
('Google Trends', 'google-trends', 'data', 'Search trends', 'Rate limited', false, null, ARRAY['trends', 'related-queries']),

-- Other
('Unsplash', 'unsplash', 'media', 'Free stock photos', '50 requests/hour', true, 'UNSPLASH_ACCESS_KEY', ARRAY['search', 'random', 'photos']),
('Pexels', 'pexels', 'media', 'Free stock media', '200 requests/hour', true, 'PEXELS_API_KEY', ARRAY['photos', 'videos', 'search'])

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own
CREATE POLICY profiles_policy ON profiles FOR ALL USING (auth.uid() = id);

-- Campaigns: Users can only see their own
CREATE POLICY campaigns_policy ON campaigns FOR ALL USING (auth.uid() = user_id);

-- Posts: Users can see posts for their campaigns
CREATE POLICY posts_policy ON campaign_posts FOR ALL 
USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- Newsletters: Users can only see their own
CREATE POLICY newsletters_policy ON newsletters FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get recommended groups for a niche
CREATE OR REPLACE FUNCTION get_recommended_groups(p_niche_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    platform_name TEXT,
    member_count INTEGER,
    activity_level TEXT,
    relevance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cg.id,
        cg.name,
        sp.name,
        cg.member_count,
        cg.activity_level,
        CASE 
            WHEN cg.activity_level = 'very-active' THEN 1.0
            WHEN cg.activity_level = 'active' THEN 0.8
            WHEN cg.activity_level = 'moderate' THEN 0.6
            ELSE 0.4
        END::DECIMAL as relevance
    FROM community_groups cg
    JOIN social_platforms sp ON cg.platform_id = sp.id
    WHERE cg.niche_id = p_niche_id
    ORDER BY relevance DESC, cg.member_count DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to track competitor mention
CREATE OR REPLACE FUNCTION log_competitor_mention(
    p_competitor_name TEXT,
    p_niche_id UUID,
    p_group_id UUID,
    p_mention_text TEXT,
    p_sentiment TEXT,
    p_source_url TEXT
) RETURNS UUID AS $$
DECLARE
    v_competitor_id UUID;
BEGIN
    -- Get or create competitor
    SELECT id INTO v_competitor_id FROM competitors WHERE LOWER(name) = LOWER(p_competitor_name);
    
    IF v_competitor_id IS NULL THEN
        INSERT INTO competitors (name, niche_id, discovered_via)
        VALUES (p_competitor_name, p_niche_id, 'group_mention')
        RETURNING id INTO v_competitor_id;
    END IF;
    
    -- Log the mention
    INSERT INTO competitor_mentions (competitor_id, group_id, mention_text, sentiment, source_url)
    VALUES (v_competitor_id, p_group_id, p_mention_text, p_sentiment, p_source_url);
    
    -- Update competitor stats
    UPDATE competitors SET 
        mention_count = mention_count + 1,
        last_mentioned_at = NOW(),
        sentiment_score = (
            SELECT AVG(CASE sentiment 
                WHEN 'positive' THEN 1 
                WHEN 'neutral' THEN 0 
                WHEN 'negative' THEN -1 
            END)
            FROM competitor_mentions WHERE competitor_id = v_competitor_id
        )
    WHERE id = v_competitor_id;
    
    RETURN v_competitor_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_posts_campaign ON campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON campaign_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON opportunity_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_newsletters_user ON newsletters(user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE campaigns IS 'Marketing campaigns with posts scheduled across platforms';
COMMENT ON TABLE community_groups IS 'Facebook groups, subreddits, Discord servers, etc. for targeted marketing';
COMMENT ON TABLE competitors IS 'Competitors discovered through community mentions';
COMMENT ON TABLE post_templates IS 'Reusable post templates with performance tracking';
COMMENT ON TABLE opportunity_alerts IS 'AI-detected opportunities from Reddit, Twitter, Quora, etc.';
