// ============================================================================
// CR AUDIOVIZ AI - AI STRATEGY GENERATOR
// Multi-AI routing: Groq (FREE) → Perplexity → OpenAI (fallback)
// ============================================================================

import { JAVARI_TOOLS } from '@/config/platforms';
import { CAMPAIGN_GOALS, INDUSTRIES } from '@/config/pricing';

export interface StrategyRequest {
  businessName: string;
  industry: string;
  goal: string;
  budget: number;
  targetArea: 'national' | 'state' | 'zip';
  targetLocation?: string;
  platforms: string[];
  description?: string;
  competitors?: string[];
}

export interface MarketingStrategy {
  id: string;
  summary: string;
  executiveSummary: string;
  targetAudience: {
    demographics: string;
    psychographics: string;
    painPoints: string[];
  };
  channels: ChannelStrategy[];
  timeline: TimelinePhase[];
  budget: BudgetAllocation;
  metrics: KPI[];
  quickWins: string[];
  javariRecommendations: JavariRecommendation[];
  generatedAt: string;
  aiProvider: string;
}

export interface ChannelStrategy {
  channel: string;
  priority: 'high' | 'medium' | 'low';
  tactics: string[];
  estimatedCost: string;
  expectedResults: string;
  timeframe: string;
}

export interface TimelinePhase {
  phase: number;
  name: string;
  duration: string;
  activities: string[];
  milestones: string[];
}

export interface BudgetAllocation {
  total: number;
  breakdown: { category: string; amount: number; percentage: number }[];
  freeAlternatives: string[];
}

export interface KPI {
  metric: string;
  target: string;
  measurementMethod: string;
}

export interface JavariRecommendation {
  productName: string;
  productUrl: string;
  reason: string;
  relevance: 'high' | 'medium';
}

// ============================================================================
// AI PROVIDERS CONFIGURATION
// ============================================================================

const AI_PROVIDERS = {
  groq: {
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    priority: 1,
    isFree: true,
  },
  perplexity: {
    name: 'Perplexity',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'llama-3.1-sonar-small-128k-online',
    priority: 2,
    isFree: false,
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    priority: 3,
    isFree: false,
  },
};

// ============================================================================
// STRATEGY PROMPT BUILDER
// ============================================================================

function buildStrategyPrompt(request: StrategyRequest): string {
  const goal = CAMPAIGN_GOALS.find((g) => g.id === request.goal);
  const industry = INDUSTRIES.find((i) => i.id === request.industry);

  return `You are an expert marketing strategist. Generate a comprehensive, actionable marketing strategy.

BUSINESS CONTEXT:
- Business: ${request.businessName}
- Industry: ${industry?.name || request.industry}
- Goal: ${goal?.name || request.goal} - ${goal?.description || ''}
- Monthly Budget: $${request.budget} (${request.budget === 0 ? 'FREE tools only' : request.budget < 500 ? 'micro-budget' : 'standard budget'})
- Target Area: ${request.targetArea}${request.targetLocation ? ` (${request.targetLocation})` : ''}
- Preferred Channels: ${request.platforms.join(', ')}
${request.description ? `- Additional Context: ${request.description}` : ''}
${request.competitors?.length ? `- Competitors: ${request.competitors.join(', ')}` : ''}

CRITICAL REQUIREMENTS:
1. PRIORITIZE FREE TOOLS AND PLATFORMS - Always suggest free alternatives first
2. Be SPECIFIC with tactics, not generic advice
3. Include realistic timelines and metrics
4. Consider the business size (small/startup based on budget)
5. Focus on ROI and measurable results

Generate a JSON response with this EXACT structure:
{
  "executiveSummary": "2-3 sentence overview of the strategy",
  "targetAudience": {
    "demographics": "Age, location, income, etc.",
    "psychographics": "Interests, values, behaviors",
    "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"]
  },
  "channels": [
    {
      "channel": "Channel name",
      "priority": "high|medium|low",
      "tactics": ["Specific tactic 1", "Specific tactic 2"],
      "estimatedCost": "$X/month or FREE",
      "expectedResults": "Specific measurable outcome",
      "timeframe": "X weeks/months"
    }
  ],
  "timeline": [
    {
      "phase": 1,
      "name": "Phase name",
      "duration": "X weeks",
      "activities": ["Activity 1", "Activity 2"],
      "milestones": ["Milestone 1"]
    }
  ],
  "budget": {
    "total": ${request.budget},
    "breakdown": [
      {"category": "Category", "amount": X, "percentage": X}
    ],
    "freeAlternatives": ["Free tool 1", "Free tool 2"]
  },
  "metrics": [
    {
      "metric": "KPI name",
      "target": "Specific target",
      "measurementMethod": "How to measure"
    }
  ],
  "quickWins": ["Quick win 1 (achievable in <2 weeks)", "Quick win 2", "Quick win 3"]
}

Return ONLY valid JSON, no markdown, no explanation.`;
}

// ============================================================================
// AI PROVIDER CALLS
// ============================================================================

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const response = await fetch(AI_PROVIDERS.groq.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.groq.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

  const response = await fetch(AI_PROVIDERS.perplexity.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.perplexity.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch(AI_PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.openai.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================================================
// JAVARI RECOMMENDATIONS
// ============================================================================

function generateJavariRecommendations(
  channels: string[],
  industry: string
): JavariRecommendation[] {
  const recommendations: JavariRecommendation[] = [];

  // Map channels to JAVARI tools
  const channelToolMap: Record<string, string[]> = {
    social: ['javari-social-graphics'],
    email: ['javari-email-builder'],
    video: ['javari-video-creator'],
    content: ['javari-writing-assistant'],
    seo: ['javari-seo-analyzer'],
  };

  for (const channel of channels) {
    const toolIds = channelToolMap[channel] || [];
    for (const toolId of toolIds) {
      const tool = JAVARI_TOOLS.find((t) => t.id === toolId);
      if (tool) {
        recommendations.push({
          productName: tool.name,
          productUrl: tool.url,
          reason: `Enhance your ${channel} marketing with AI-powered ${tool.description.toLowerCase()}`,
          relevance: 'high',
        });
      }
    }
  }

  // Add general recommendations based on industry
  if (['ecommerce', 'saas', 'agency'].includes(industry)) {
    recommendations.push({
      productName: 'JAVARI Analytics Dashboard',
      productUrl: 'https://craudiovizai.com/tools/analytics',
      reason: 'Track all your marketing metrics in one place',
      relevance: 'medium',
    });
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

// ============================================================================
// MAIN STRATEGY GENERATOR
// ============================================================================

export async function generateStrategy(
  request: StrategyRequest
): Promise<{ strategy: MarketingStrategy; provider: string }> {
  const prompt = buildStrategyPrompt(request);
  let rawResponse: string;
  let provider: string;

  // Try providers in order: Groq (FREE) → Perplexity → OpenAI
  try {
    rawResponse = await callGroq(prompt);
    provider = 'Groq';
  } catch (groqError) {
    console.warn('Groq failed, trying Perplexity:', groqError);
    try {
      rawResponse = await callPerplexity(prompt);
      provider = 'Perplexity';
    } catch (perplexityError) {
      console.warn('Perplexity failed, trying OpenAI:', perplexityError);
      rawResponse = await callOpenAI(prompt);
      provider = 'OpenAI';
    }
  }

  // Parse JSON response
  let parsed;
  try {
    // Clean up potential markdown formatting
    const cleanJson = rawResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseError) {
    console.error('Failed to parse AI response:', rawResponse);
    throw new Error('Failed to parse strategy response');
  }

  // Build final strategy object
  const strategy: MarketingStrategy = {
    id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    summary: `Marketing strategy for ${request.businessName}`,
    executiveSummary: parsed.executiveSummary,
    targetAudience: parsed.targetAudience,
    channels: parsed.channels || [],
    timeline: parsed.timeline || [],
    budget: parsed.budget || {
      total: request.budget,
      breakdown: [],
      freeAlternatives: [],
    },
    metrics: parsed.metrics || [],
    quickWins: parsed.quickWins || [],
    javariRecommendations: generateJavariRecommendations(request.platforms, request.industry),
    generatedAt: new Date().toISOString(),
    aiProvider: provider,
  };

  return { strategy, provider };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function estimateStrategyCredits(request: StrategyRequest): number {
  // Base cost + complexity modifiers
  let credits = 10;
  if (request.platforms.length > 3) credits += 5;
  if (request.targetArea === 'zip') credits += 10;
  if (request.competitors && request.competitors.length > 0) credits += 5;
  return credits;
}

export function validateStrategyRequest(request: StrategyRequest): string[] {
  const errors: string[] = [];

  if (!request.businessName?.trim()) {
    errors.push('Business name is required');
  }
  if (!request.industry) {
    errors.push('Industry is required');
  }
  if (!request.goal) {
    errors.push('Campaign goal is required');
  }
  if (request.budget < 0) {
    errors.push('Budget cannot be negative');
  }
  if (!request.platforms || request.platforms.length === 0) {
    errors.push('At least one marketing channel is required');
  }

  return errors;
}
