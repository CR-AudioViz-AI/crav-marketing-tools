// ============================================================================
// CR AUDIOVIZ AI - MARKETING COMMAND CENTER PRICING
// Subscription tiers with FREE tier emphasis
// ============================================================================

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year' | 'lifetime';
  description: string;
  features: string[];
  limits: {
    strategiesPerMonth: number;
    censusLookups: number;
    aiCredits: number;
    savedStrategies: number;
    teamMembers: number;
  };
  cta: string;
  popular?: boolean;
  stripePriceId?: string;
}

export interface CampaignGoal {
  id: string;
  name: string;
  description: string;
  icon: string;
  suggestedChannels: string[];
  budgetRange: { min: number; max: number };
  timeframe: string;
}

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    interval: 'month',
    description: 'Perfect for solopreneurs and small projects',
    features: [
      '3 AI strategies per month',
      '100+ FREE platform directory',
      'Launch checklist generator',
      'Basic market trends',
      'Community support',
      'javari tools recommendations',
    ],
    limits: {
      strategiesPerMonth: 3,
      censusLookups: 0,
      aiCredits: 100,
      savedStrategies: 5,
      teamMembers: 1,
    },
    cta: 'Start Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    interval: 'month',
    description: 'For growing businesses and marketers',
    features: [
      'Unlimited AI strategies',
      'ZIP-code demographics (Census)',
      'Competitor analysis',
      'Advanced market trends',
      'Priority support',
      'Export strategies as PDF',
      'Custom brand templates',
      'API access',
    ],
    limits: {
      strategiesPerMonth: -1,
      censusLookups: 100,
      aiCredits: 2000,
      savedStrategies: 100,
      teamMembers: 5,
    },
    cta: 'Go Pro',
    popular: true,
    stripePriceId: 'price_marketing_pro_monthly',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    description: 'For agencies and large teams',
    features: [
      'Everything in Pro',
      'Unlimited Census lookups',
      'White-label reports',
      'Custom AI training',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO integration',
      'Custom integrations',
    ],
    limits: {
      strategiesPerMonth: -1,
      censusLookups: -1,
      aiCredits: 10000,
      savedStrategies: -1,
      teamMembers: -1,
    },
    cta: 'Contact Sales',
    stripePriceId: 'price_marketing_enterprise_monthly',
  },
];

// ============================================================================
// CAMPAIGN GOALS
// ============================================================================

export const CAMPAIGN_GOALS: CampaignGoal[] = [
  {
    id: 'brand-awareness',
    name: 'Brand Awareness',
    description: 'Get your brand in front of new audiences',
    icon: 'eye',
    suggestedChannels: ['social', 'content', 'pr', 'influencer'],
    budgetRange: { min: 0, max: 5000 },
    timeframe: '3-6 months',
  },
  {
    id: 'lead-generation',
    name: 'Lead Generation',
    description: 'Capture qualified leads for your sales team',
    icon: 'users',
    suggestedChannels: ['email', 'ads', 'content', 'seo'],
    budgetRange: { min: 500, max: 10000 },
    timeframe: '1-3 months',
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Launch a new product with maximum impact',
    icon: 'rocket',
    suggestedChannels: ['pr', 'social', 'email', 'community'],
    budgetRange: { min: 0, max: 25000 },
    timeframe: '1-2 months',
  },
  {
    id: 'sales-conversion',
    name: 'Sales Conversion',
    description: 'Turn prospects into paying customers',
    icon: 'dollar-sign',
    suggestedChannels: ['email', 'retargeting', 'landing-pages'],
    budgetRange: { min: 1000, max: 15000 },
    timeframe: '1-2 months',
  },
  {
    id: 'community-building',
    name: 'Community Building',
    description: 'Build a loyal community around your brand',
    icon: 'heart',
    suggestedChannels: ['social', 'discord', 'events', 'content'],
    budgetRange: { min: 0, max: 3000 },
    timeframe: '6-12 months',
  },
  {
    id: 'seo-growth',
    name: 'SEO Growth',
    description: 'Dominate search rankings organically',
    icon: 'search',
    suggestedChannels: ['content', 'technical-seo', 'backlinks'],
    budgetRange: { min: 0, max: 5000 },
    timeframe: '6-12 months',
  },
  {
    id: 'local-marketing',
    name: 'Local Marketing',
    description: 'Reach customers in your local area',
    icon: 'map-pin',
    suggestedChannels: ['local-seo', 'google-business', 'community'],
    budgetRange: { min: 0, max: 2000 },
    timeframe: '2-4 months',
  },
  {
    id: 'app-downloads',
    name: 'App Downloads',
    description: 'Drive installs for your mobile app',
    icon: 'smartphone',
    suggestedChannels: ['aso', 'ads', 'influencer', 'pr'],
    budgetRange: { min: 1000, max: 20000 },
    timeframe: '1-3 months',
  },
];

// ============================================================================
// INDUSTRY VERTICALS
// ============================================================================

export const INDUSTRIES = [
  { id: 'saas', name: 'SaaS / Software', icon: 'code' },
  { id: 'ecommerce', name: 'E-commerce / Retail', icon: 'shopping-cart' },
  { id: 'healthcare', name: 'Healthcare / Medical', icon: 'heart-pulse' },
  { id: 'finance', name: 'Finance / Fintech', icon: 'landmark' },
  { id: 'education', name: 'Education / EdTech', icon: 'graduation-cap' },
  { id: 'real-estate', name: 'Real Estate', icon: 'home' },
  { id: 'food', name: 'Food & Beverage', icon: 'utensils' },
  { id: 'travel', name: 'Travel / Hospitality', icon: 'plane' },
  { id: 'fitness', name: 'Fitness / Wellness', icon: 'dumbbell' },
  { id: 'entertainment', name: 'Entertainment / Media', icon: 'film' },
  { id: 'nonprofit', name: 'Nonprofit / NGO', icon: 'hand-heart' },
  { id: 'agency', name: 'Agency / Consulting', icon: 'briefcase' },
  { id: 'creator', name: 'Creator / Influencer', icon: 'sparkles' },
  { id: 'local', name: 'Local Business', icon: 'store' },
  { id: 'other', name: 'Other', icon: 'grid' },
] as const;

// ============================================================================
// BUDGET RANGES
// ============================================================================

export const BUDGET_RANGES = [
  { id: 'zero', name: '$0 (FREE only)', min: 0, max: 0 },
  { id: 'micro', name: '$1 - $100/mo', min: 1, max: 100 },
  { id: 'small', name: '$100 - $500/mo', min: 100, max: 500 },
  { id: 'medium', name: '$500 - $2,000/mo', min: 500, max: 2000 },
  { id: 'large', name: '$2,000 - $10,000/mo', min: 2000, max: 10000 },
  { id: 'enterprise', name: '$10,000+/mo', min: 10000, max: Infinity },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTierById(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.id === id);
}

export function getGoalById(id: string): CampaignGoal | undefined {
  return CAMPAIGN_GOALS.find((goal) => goal.id === id);
}

export function canUserAccessFeature(
  userTier: string,
  feature: 'census' | 'unlimited' | 'api' | 'whitelabel'
): boolean {
  const tierHierarchy = ['starter', 'pro', 'enterprise'];
  const featureRequirements: Record<string, string> = {
    census: 'pro',
    unlimited: 'pro',
    api: 'pro',
    whitelabel: 'enterprise',
  };

  const userTierIndex = tierHierarchy.indexOf(userTier);
  const requiredTierIndex = tierHierarchy.indexOf(featureRequirements[feature]);

  return userTierIndex >= requiredTierIndex;
}

export function getRemainingStrategies(
  userTier: string,
  usedThisMonth: number
): number {
  const tier = getTierById(userTier);
  if (!tier) return 0;
  if (tier.limits.strategiesPerMonth === -1) return Infinity;
  return Math.max(0, tier.limits.strategiesPerMonth - usedThisMonth);
}
