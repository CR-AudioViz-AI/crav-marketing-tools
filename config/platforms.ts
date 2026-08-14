// ============================================================================
// CR AUDIOVIZ AI - MARKETING PLATFORMS DATABASE
// 100+ platforms organized by tier (FREE → Budget → Premium)
// ============================================================================

export interface MarketingPlatform {
  id: string;
  name: string;
  category: PlatformCategory;
  tier: 'free' | 'budget' | 'premium';
  description: string;
  url: string;
  pricing?: string;
  features: string[];
  bestFor: string[];
  javariAlternative?: {
    name: string;
    url: string;
    description: string;
  };
}

export type PlatformCategory =
  | 'social'
  | 'email'
  | 'seo'
  | 'content'
  | 'analytics'
  | 'ads'
  | 'community'
  | 'video'
  | 'design'
  | 'local'
  | 'pr'
  | 'automation';

export const PLATFORM_CATEGORIES: { id: PlatformCategory; name: string; icon: string }[] = [
  { id: 'social', name: 'Social Media', icon: 'share-2' },
  { id: 'email', name: 'Email Marketing', icon: 'mail' },
  { id: 'seo', name: 'SEO Tools', icon: 'search' },
  { id: 'content', name: 'Content Marketing', icon: 'file-text' },
  { id: 'analytics', name: 'Analytics', icon: 'bar-chart-3' },
  { id: 'ads', name: 'Advertising', icon: 'megaphone' },
  { id: 'community', name: 'Community', icon: 'users' },
  { id: 'video', name: 'Video Marketing', icon: 'video' },
  { id: 'design', name: 'Design Tools', icon: 'palette' },
  { id: 'local', name: 'Local Marketing', icon: 'map-pin' },
  { id: 'pr', name: 'PR & Outreach', icon: 'newspaper' },
  { id: 'automation', name: 'Automation', icon: 'zap' },
];

// ============================================================================
// PLATFORMS DATABASE - 100+ PLATFORMS
// ============================================================================

export const PLATFORMS: MarketingPlatform[] = [
  // ========== SOCIAL MEDIA - FREE ==========
  {
    id: 'buffer-free',
    name: 'Buffer (Free)',
    category: 'social',
    tier: 'free',
    description: 'Schedule posts to 3 social channels with basic analytics',
    url: 'https://buffer.com',
    pricing: 'Free for 3 channels',
    features: ['3 social accounts', '10 scheduled posts', 'Basic analytics'],
    bestFor: ['Solopreneurs', 'Small businesses', 'Beginners'],
  },
  {
    id: 'later-free',
    name: 'Later (Free)',
    category: 'social',
    tier: 'free',
    description: 'Visual social media planner with Instagram focus',
    url: 'https://later.com',
    pricing: 'Free for 1 profile per platform',
    features: ['Visual planner', 'Instagram focus', 'Linkin.bio'],
    bestFor: ['Instagram creators', 'Visual brands'],
  },
  {
    id: 'tweetdeck',
    name: 'TweetDeck',
    category: 'social',
    tier: 'free',
    description: 'Free Twitter/X management dashboard',
    url: 'https://tweetdeck.twitter.com',
    pricing: 'Free',
    features: ['Multiple columns', 'Scheduled tweets', 'Team accounts'],
    bestFor: ['Twitter power users', 'News monitoring'],
  },
  {
    id: 'canva-social',
    name: 'Canva (Free)',
    category: 'social',
    tier: 'free',
    description: 'Design social media graphics with templates',
    url: 'https://canva.com',
    pricing: 'Free with limits',
    features: ['Templates', 'Basic editing', 'Social sizes'],
    bestFor: ['Non-designers', 'Quick graphics'],
    javariAlternative: {
      name: 'JAVARI Social Graphics',
      url: 'https://craudiovizai.com/tools/social-graphics',
      description: 'AI-powered social media graphics generator',
    },
  },

  // ========== SOCIAL MEDIA - BUDGET ==========
  {
    id: 'buffer-essentials',
    name: 'Buffer Essentials',
    category: 'social',
    tier: 'budget',
    description: 'Advanced scheduling with engagement tools',
    url: 'https://buffer.com',
    pricing: '$6/mo per channel',
    features: ['Unlimited posts', 'Engagement tools', 'Analytics'],
    bestFor: ['Growing businesses', 'Agencies'],
  },
  {
    id: 'hootsuite-pro',
    name: 'Hootsuite Professional',
    category: 'social',
    tier: 'budget',
    description: 'Comprehensive social media management',
    url: 'https://hootsuite.com',
    pricing: '$99/mo',
    features: ['10 social accounts', 'Scheduling', 'Analytics', 'Team features'],
    bestFor: ['Mid-size businesses', 'Marketing teams'],
  },

  // ========== SOCIAL MEDIA - PREMIUM ==========
  {
    id: 'sprout-social',
    name: 'Sprout Social',
    category: 'social',
    tier: 'premium',
    description: 'Enterprise social media management',
    url: 'https://sproutsocial.com',
    pricing: '$249/mo',
    features: ['5 profiles', 'CRM', 'Advanced analytics', 'Listening'],
    bestFor: ['Enterprise', 'Agencies'],
  },

  // ========== EMAIL MARKETING - FREE ==========
  {
    id: 'mailchimp-free',
    name: 'Mailchimp (Free)',
    category: 'email',
    tier: 'free',
    description: 'Email marketing with 500 contacts free',
    url: 'https://mailchimp.com',
    pricing: 'Free up to 500 contacts',
    features: ['500 contacts', '1,000 sends/mo', 'Basic templates'],
    bestFor: ['Startups', 'Small lists'],
    javariAlternative: {
      name: 'JAVARI Email Builder',
      url: 'https://craudiovizai.com/tools/email-builder',
      description: 'AI-powered email template generator',
    },
  },
  {
    id: 'sender-free',
    name: 'Sender (Free)',
    category: 'email',
    tier: 'free',
    description: 'Generous free tier for email marketing',
    url: 'https://sender.net',
    pricing: 'Free up to 2,500 contacts',
    features: ['2,500 contacts', '15,000 emails/mo', 'Automation'],
    bestFor: ['Budget-conscious', 'Growing lists'],
  },
  {
    id: 'mailerlite-free',
    name: 'MailerLite (Free)',
    category: 'email',
    tier: 'free',
    description: 'Modern email marketing with landing pages',
    url: 'https://mailerlite.com',
    pricing: 'Free up to 1,000 subscribers',
    features: ['1,000 subscribers', '12,000 emails/mo', 'Landing pages'],
    bestFor: ['Creators', 'Newsletters'],
  },
  {
    id: 'buttondown',
    name: 'Buttondown (Free)',
    category: 'email',
    tier: 'free',
    description: 'Simple newsletter tool for writers',
    url: 'https://buttondown.email',
    pricing: 'Free up to 100 subscribers',
    features: ['Markdown support', 'Simple UI', 'RSS to email'],
    bestFor: ['Writers', 'Minimalists'],
  },

  // ========== EMAIL - BUDGET ==========
  {
    id: 'convertkit',
    name: 'ConvertKit',
    category: 'email',
    tier: 'budget',
    description: 'Email marketing for creators',
    url: 'https://convertkit.com',
    pricing: '$29/mo for 1,000 subscribers',
    features: ['Visual automations', 'Landing pages', 'Creator network'],
    bestFor: ['Creators', 'Course sellers'],
  },
  {
    id: 'beehiiv',
    name: 'Beehiiv',
    category: 'email',
    tier: 'budget',
    description: 'Newsletter platform with growth tools',
    url: 'https://beehiiv.com',
    pricing: '$49/mo',
    features: ['Recommendations', 'Monetization', 'Analytics'],
    bestFor: ['Newsletter businesses', 'Media companies'],
  },

  // ========== SEO TOOLS - FREE ==========
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    category: 'seo',
    tier: 'free',
    description: 'Official Google SEO tool - essential and free',
    url: 'https://search.google.com/search-console',
    pricing: 'Free',
    features: ['Search performance', 'Index coverage', 'Core Web Vitals'],
    bestFor: ['Everyone with a website'],
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics 4',
    category: 'seo',
    tier: 'free',
    description: 'Comprehensive website analytics',
    url: 'https://analytics.google.com',
    pricing: 'Free',
    features: ['Traffic analysis', 'Conversions', 'Audience insights'],
    bestFor: ['All websites'],
  },
  {
    id: 'ubersuggest-free',
    name: 'Ubersuggest (Free)',
    category: 'seo',
    tier: 'free',
    description: 'Keyword research with limited free searches',
    url: 'https://neilpatel.com/ubersuggest',
    pricing: 'Free with limits',
    features: ['3 searches/day', 'Keyword ideas', 'Basic metrics'],
    bestFor: ['Beginners', 'Quick research'],
  },
  {
    id: 'answerthepublic',
    name: 'AnswerThePublic (Free)',
    category: 'seo',
    tier: 'free',
    description: 'Find questions people ask about any topic',
    url: 'https://answerthepublic.com',
    pricing: 'Free with limits',
    features: ['Question research', 'Visual maps', 'Content ideas'],
    bestFor: ['Content planning', 'FAQ creation'],
  },
  {
    id: 'seoquake',
    name: 'SEOquake',
    category: 'seo',
    tier: 'free',
    description: 'Free browser extension for SEO metrics',
    url: 'https://seoquake.com',
    pricing: 'Free',
    features: ['SERP overlay', 'Page audit', 'Compare domains'],
    bestFor: ['Quick SEO checks', 'Competitor analysis'],
  },

  // ========== SEO - BUDGET ==========
  {
    id: 'ahrefs-webmaster',
    name: 'Ahrefs Webmaster Tools',
    category: 'seo',
    tier: 'free',
    description: 'Free version of Ahrefs for your own site',
    url: 'https://ahrefs.com/webmaster-tools',
    pricing: 'Free for verified sites',
    features: ['Backlink data', 'Site audit', 'Keyword ranking'],
    bestFor: ['Site owners', 'Technical SEO'],
  },
  {
    id: 'semrush',
    name: 'Semrush Pro',
    category: 'seo',
    tier: 'budget',
    description: 'All-in-one SEO and marketing toolkit',
    url: 'https://semrush.com',
    pricing: '$129/mo',
    features: ['Keyword research', 'Site audit', 'Competitor analysis'],
    bestFor: ['SEO professionals', 'Agencies'],
  },

  // ========== CONTENT MARKETING - FREE ==========
  {
    id: 'medium',
    name: 'Medium',
    category: 'content',
    tier: 'free',
    description: 'Free publishing platform with built-in audience',
    url: 'https://medium.com',
    pricing: 'Free to publish',
    features: ['Built-in audience', 'Partner program', 'Publications'],
    bestFor: ['Writers', 'Thought leaders'],
  },
  {
    id: 'hashnode',
    name: 'Hashnode',
    category: 'content',
    tier: 'free',
    description: 'Free blogging platform for developers',
    url: 'https://hashnode.com',
    pricing: 'Free',
    features: ['Custom domain', 'Newsletter', 'Community'],
    bestFor: ['Developers', 'Tech writers'],
  },
  {
    id: 'substack',
    name: 'Substack',
    category: 'content',
    tier: 'free',
    description: 'Newsletter platform with monetization',
    url: 'https://substack.com',
    pricing: 'Free (10% on paid subs)',
    features: ['Newsletter', 'Podcasts', 'Paid subscriptions'],
    bestFor: ['Independent writers', 'Journalists'],
  },
  {
    id: 'notion-public',
    name: 'Notion (Public Pages)',
    category: 'content',
    tier: 'free',
    description: 'Create free public pages and docs',
    url: 'https://notion.so',
    pricing: 'Free',
    features: ['Public pages', 'Databases', 'Collaboration'],
    bestFor: ['Documentation', 'Resource hubs'],
  },
  {
    id: 'grammarly-free',
    name: 'Grammarly (Free)',
    category: 'content',
    tier: 'free',
    description: 'Basic grammar and spelling checker',
    url: 'https://grammarly.com',
    pricing: 'Free with limits',
    features: ['Grammar check', 'Spelling', 'Basic suggestions'],
    bestFor: ['All writers'],
    javariAlternative: {
      name: 'JAVARI Writing Assistant',
      url: 'https://craudiovizai.com/tools/writing-assistant',
      description: 'AI writing assistant with style suggestions',
    },
  },

  // ========== ANALYTICS - FREE ==========
  {
    id: 'plausible',
    name: 'Plausible Analytics',
    category: 'analytics',
    tier: 'free',
    description: 'Privacy-focused analytics (self-hosted free)',
    url: 'https://plausible.io',
    pricing: 'Free self-hosted',
    features: ['Privacy-focused', 'Lightweight', 'No cookies'],
    bestFor: ['Privacy-conscious', 'EU compliance'],
  },
  {
    id: 'umami',
    name: 'Umami',
    category: 'analytics',
    tier: 'free',
    description: 'Open source website analytics',
    url: 'https://umami.is',
    pricing: 'Free self-hosted',
    features: ['Open source', 'Real-time', 'Custom events'],
    bestFor: ['Developers', 'Self-hosters'],
  },
  {
    id: 'clarity',
    name: 'Microsoft Clarity',
    category: 'analytics',
    tier: 'free',
    description: 'Free heatmaps and session recordings',
    url: 'https://clarity.microsoft.com',
    pricing: 'Free',
    features: ['Heatmaps', 'Session recordings', 'Insights'],
    bestFor: ['UX optimization', 'Conversion analysis'],
  },
  {
    id: 'hotjar-free',
    name: 'Hotjar (Free)',
    category: 'analytics',
    tier: 'free',
    description: 'Heatmaps and surveys with free tier',
    url: 'https://hotjar.com',
    pricing: 'Free up to 35 sessions/day',
    features: ['Heatmaps', 'Recordings', 'Surveys'],
    bestFor: ['User research', 'CRO'],
  },

  // ========== COMMUNITY - FREE ==========
  {
    id: 'discord',
    name: 'Discord',
    category: 'community',
    tier: 'free',
    description: 'Free community platform with voice/video',
    url: 'https://discord.com',
    pricing: 'Free',
    features: ['Text channels', 'Voice/video', 'Bots', 'Roles'],
    bestFor: ['Gaming', 'Tech communities', 'Brand communities'],
  },
  {
    id: 'slack-free',
    name: 'Slack (Free)',
    category: 'community',
    tier: 'free',
    description: 'Team communication with limited history',
    url: 'https://slack.com',
    pricing: 'Free with limits',
    features: ['90-day history', '10 integrations', 'Channels'],
    bestFor: ['Small teams', 'Startups'],
  },
  {
    id: 'telegram-groups',
    name: 'Telegram Groups',
    category: 'community',
    tier: 'free',
    description: 'Large group chats up to 200K members',
    url: 'https://telegram.org',
    pricing: 'Free',
    features: ['200K members', 'Bots', 'Channels', 'Polls'],
    bestFor: ['Crypto', 'International audiences'],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'community',
    tier: 'free',
    description: 'Build a subreddit community',
    url: 'https://reddit.com',
    pricing: 'Free',
    features: ['Subreddits', 'Karma system', 'AMAs'],
    bestFor: ['Niche communities', 'Q&A'],
  },

  // ========== VIDEO MARKETING - FREE ==========
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'video',
    tier: 'free',
    description: 'The largest video platform - free to upload',
    url: 'https://youtube.com',
    pricing: 'Free',
    features: ['Unlimited uploads', 'Monetization', 'Analytics'],
    bestFor: ['Video content', 'Tutorials', 'Brand channels'],
    javariAlternative: {
      name: 'JAVARI Video Creator',
      url: 'https://craudiovizai.com/tools/video-creator',
      description: 'AI-powered video creation and editing',
    },
  },
  {
    id: 'loom-free',
    name: 'Loom (Free)',
    category: 'video',
    tier: 'free',
    description: 'Quick video recording and sharing',
    url: 'https://loom.com',
    pricing: 'Free up to 25 videos',
    features: ['Screen recording', 'Webcam', 'Easy sharing'],
    bestFor: ['Async communication', 'Demos'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'video',
    tier: 'free',
    description: 'Short-form video platform',
    url: 'https://tiktok.com',
    pricing: 'Free',
    features: ['Short videos', 'Trends', 'Creator fund'],
    bestFor: ['Gen Z audience', 'Viral content'],
  },
  {
    id: 'capcut',
    name: 'CapCut',
    category: 'video',
    tier: 'free',
    description: 'Free video editing app from TikTok',
    url: 'https://capcut.com',
    pricing: 'Free',
    features: ['Video editing', 'Effects', 'Templates'],
    bestFor: ['TikTok creators', 'Quick edits'],
  },
  {
    id: 'davinci-resolve',
    name: 'DaVinci Resolve (Free)',
    category: 'video',
    tier: 'free',
    description: 'Professional video editing - free version',
    url: 'https://blackmagicdesign.com/products/davinciresolve',
    pricing: 'Free',
    features: ['Pro editing', 'Color grading', 'Audio'],
    bestFor: ['Professional videos', 'Film quality'],
  },

  // ========== DESIGN TOOLS - FREE ==========
  {
    id: 'figma-free',
    name: 'Figma (Free)',
    category: 'design',
    tier: 'free',
    description: 'Collaborative design tool with free tier',
    url: 'https://figma.com',
    pricing: 'Free for 3 projects',
    features: ['3 projects', 'Collaboration', 'Prototyping'],
    bestFor: ['UI/UX', 'Collaboration'],
  },
  {
    id: 'canva-free',
    name: 'Canva (Free)',
    category: 'design',
    tier: 'free',
    description: 'Easy graphic design with templates',
    url: 'https://canva.com',
    pricing: 'Free with limits',
    features: ['Templates', 'Basic editing', 'Social sizes'],
    bestFor: ['Non-designers', 'Marketing materials'],
  },
  {
    id: 'photopea',
    name: 'Photopea',
    category: 'design',
    tier: 'free',
    description: 'Free Photoshop alternative in browser',
    url: 'https://photopea.com',
    pricing: 'Free',
    features: ['PSD support', 'Advanced editing', 'No install'],
    bestFor: ['Photo editing', 'PSD files'],
  },
  {
    id: 'remove-bg',
    name: 'Remove.bg',
    category: 'design',
    tier: 'free',
    description: 'AI background removal',
    url: 'https://remove.bg',
    pricing: 'Free with limits',
    features: ['AI background removal', 'Quick processing'],
    bestFor: ['Product photos', 'Portraits'],
  },

  // ========== LOCAL MARKETING - FREE ==========
  {
    id: 'google-business',
    name: 'Google Business Profile',
    category: 'local',
    tier: 'free',
    description: 'Essential for local SEO - completely free',
    url: 'https://business.google.com',
    pricing: 'Free',
    features: ['Maps listing', 'Reviews', 'Posts', 'Insights'],
    bestFor: ['Local businesses', 'Retail', 'Services'],
  },
  {
    id: 'yelp',
    name: 'Yelp Business',
    category: 'local',
    tier: 'free',
    description: 'Claim your free business listing',
    url: 'https://biz.yelp.com',
    pricing: 'Free listing',
    features: ['Business listing', 'Reviews', 'Photos'],
    bestFor: ['Restaurants', 'Local services'],
  },
  {
    id: 'nextdoor',
    name: 'Nextdoor Business',
    category: 'local',
    tier: 'free',
    description: 'Neighborhood-based business page',
    url: 'https://business.nextdoor.com',
    pricing: 'Free listing',
    features: ['Local reach', 'Recommendations', 'Posts'],
    bestFor: ['Neighborhood businesses', 'Home services'],
  },

  // ========== PR & OUTREACH - FREE ==========
  {
    id: 'haro',
    name: 'HARO (Connectively)',
    category: 'pr',
    tier: 'free',
    description: 'Get quoted in media - journalist queries',
    url: 'https://connectively.us',
    pricing: 'Free',
    features: ['Journalist queries', 'Media opportunities'],
    bestFor: ['PR', 'Thought leadership', 'Backlinks'],
  },
  {
    id: 'hunter-free',
    name: 'Hunter.io (Free)',
    category: 'pr',
    tier: 'free',
    description: 'Find email addresses for outreach',
    url: 'https://hunter.io',
    pricing: 'Free - 25 searches/mo',
    features: ['Email finder', 'Verification', 'Domain search'],
    bestFor: ['Cold outreach', 'Link building'],
  },
  {
    id: 'featured',
    name: 'Featured.com',
    category: 'pr',
    tier: 'free',
    description: 'Expert quotes for journalists',
    url: 'https://featured.com',
    pricing: 'Free',
    features: ['Expert matching', 'Media coverage'],
    bestFor: ['Experts', 'Thought leaders'],
  },

  // ========== AUTOMATION - FREE ==========
  {
    id: 'zapier-free',
    name: 'Zapier (Free)',
    category: 'automation',
    tier: 'free',
    description: 'Connect apps with automation',
    url: 'https://zapier.com',
    pricing: 'Free - 5 zaps, 100 tasks/mo',
    features: ['5 zaps', '100 tasks', 'Basic integrations'],
    bestFor: ['Simple automation', 'App connections'],
  },
  {
    id: 'make-free',
    name: 'Make (Free)',
    category: 'automation',
    tier: 'free',
    description: 'Visual automation builder',
    url: 'https://make.com',
    pricing: 'Free - 1,000 operations/mo',
    features: ['Visual builder', '1,000 ops/mo', 'Complex workflows'],
    bestFor: ['Complex automation', 'Visual learners'],
  },
  {
    id: 'n8n',
    name: 'n8n (Self-hosted)',
    category: 'automation',
    tier: 'free',
    description: 'Open source workflow automation',
    url: 'https://n8n.io',
    pricing: 'Free self-hosted',
    features: ['Open source', 'Unlimited workflows', 'Self-hosted'],
    bestFor: ['Developers', 'Privacy-conscious'],
  },
  {
    id: 'ifttt-free',
    name: 'IFTTT (Free)',
    category: 'automation',
    tier: 'free',
    description: 'Simple if-this-then-that automation',
    url: 'https://ifttt.com',
    pricing: 'Free - 2 applets',
    features: ['2 applets', 'Simple triggers', 'IoT support'],
    bestFor: ['Simple automation', 'Smart home'],
  },

  // ========== ADVERTISING - FREE/CREDITS ==========
  {
    id: 'google-ads-credits',
    name: 'Google Ads (Free Credits)',
    category: 'ads',
    tier: 'free',
    description: 'Often offers $500+ in free ad credits for new accounts',
    url: 'https://ads.google.com',
    pricing: 'Free credits available',
    features: ['Search ads', 'Display ads', 'YouTube ads'],
    bestFor: ['New advertisers', 'Testing'],
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads (No Minimum)',
    category: 'ads',
    tier: 'budget',
    description: 'Start with any budget on Facebook/Instagram',
    url: 'https://business.facebook.com',
    pricing: 'No minimum spend',
    features: ['Facebook ads', 'Instagram ads', 'Targeting'],
    bestFor: ['Social advertising', 'Retargeting'],
  },
  {
    id: 'reddit-ads',
    name: 'Reddit Ads',
    category: 'ads',
    tier: 'budget',
    description: 'Often offers free ad credits, low minimums',
    url: 'https://ads.reddit.com',
    pricing: '$5/day minimum',
    features: ['Subreddit targeting', 'Interest targeting'],
    bestFor: ['Niche audiences', 'Tech products'],
  },

  // ========== PREMIUM TOOLS ==========
  {
    id: 'hubspot',
    name: 'HubSpot Marketing Hub',
    category: 'automation',
    tier: 'premium',
    description: 'All-in-one marketing platform',
    url: 'https://hubspot.com',
    pricing: '$800+/mo',
    features: ['CRM', 'Email', 'Automation', 'Analytics'],
    bestFor: ['Enterprise', 'B2B'],
  },
  {
    id: 'salesforce-marketing',
    name: 'Salesforce Marketing Cloud',
    category: 'automation',
    tier: 'premium',
    description: 'Enterprise marketing automation',
    url: 'https://salesforce.com/marketing-cloud',
    pricing: 'Custom pricing',
    features: ['Journey builder', 'Email', 'Mobile', 'Social'],
    bestFor: ['Enterprise', 'Large scale'],
  },
];

// ============================================================================
// JAVARI TOOL ALTERNATIVES
// ============================================================================

export const JAVARI_TOOLS = [
  {
    id: 'javari-social-graphics',
    name: 'JAVARI Social Graphics',
    category: 'social',
    url: 'https://craudiovizai.com/tools/social-graphics',
    description: 'AI-powered social media graphics generator',
    replaces: ['Canva', 'Adobe Express'],
    pricing: 'Included in JAVARI subscription',
  },
  {
    id: 'javari-email-builder',
    name: 'JAVARI Email Builder',
    category: 'email',
    url: 'https://craudiovizai.com/tools/email-builder',
    description: 'AI email template generator',
    replaces: ['Mailchimp templates', 'Stripo'],
    pricing: 'Included in JAVARI subscription',
  },
  {
    id: 'javari-video-creator',
    name: 'JAVARI Video Creator',
    category: 'video',
    url: 'https://craudiovizai.com/tools/video-creator',
    description: 'AI video creation and editing',
    replaces: ['Loom', 'Descript'],
    pricing: 'Included in JAVARI subscription',
  },
  {
    id: 'javari-writing-assistant',
    name: 'JAVARI Writing Assistant',
    category: 'content',
    url: 'https://craudiovizai.com/tools/writing-assistant',
    description: 'AI writing assistant',
    replaces: ['Grammarly', 'Jasper'],
    pricing: 'Included in JAVARI subscription',
  },
  {
    id: 'javari-seo-analyzer',
    name: 'JAVARI SEO Analyzer',
    category: 'seo',
    url: 'https://craudiovizai.com/tools/seo-analyzer',
    description: 'AI-powered SEO analysis',
    replaces: ['Ubersuggest', 'Moz'],
    pricing: 'Included in JAVARI subscription',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPlatformsByCategory(category: PlatformCategory): MarketingPlatform[] {
  return PLATFORMS.filter((p) => p.category === category);
}

export function getPlatformsByTier(tier: 'free' | 'budget' | 'premium'): MarketingPlatform[] {
  return PLATFORMS.filter((p) => p.tier === tier);
}

export function getFreePlatforms(): MarketingPlatform[] {
  return PLATFORMS.filter((p) => p.tier === 'free');
}

export function searchPlatforms(query: string): MarketingPlatform[] {
  const q = query.toLowerCase();
  return PLATFORMS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.features.some((f) => f.toLowerCase().includes(q)) ||
      p.bestFor.some((b) => b.toLowerCase().includes(q))
  );
}

export function getPlatformsWithJavariAlternatives(): MarketingPlatform[] {
  return PLATFORMS.filter((p) => p.javariAlternative);
}

export function getJavariAlternativeFor(platformId: string): MarketingPlatform['javariAlternative'] | undefined {
  const platform = PLATFORMS.find((p) => p.id === platformId);
  return platform?.javariAlternative;
}
