import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";


function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}

export interface BrandSettings {
  company_name: string;
  tagline: string;
  hashtags_primary: string[];
  hashtags_secondary: string[];
  logo_url: string;
  website_url: string;
  cta_default: string;
  footer_text: string;
  tone_voice: {
    style: string;
    avoid: string[];
    embrace: string[];
  };
}

export interface PlatformRules {
  platform: string;
  character_limit: number | null;
  media_required: boolean;
  media_types: string[];
  max_media_count: number;
  max_hashtags: number | null;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  best_posting_times: Record<string, string[]>;
  content_rules: Record<string, boolean | string>;
}

export interface BrandedContent {
  platform: string;
  content: string;
  hashtags: string[];
  truncated: boolean;
  mediaIncluded: boolean;
  cta: string | null;
  characterCount: number;
  characterLimit: number | null;
  warnings: string[];
}

// Load brand settings from database
export async function loadBrandSettings(): Promise<BrandSettings> {
  const { data, error } = await supabase
    .from('brand_settings')
    .select('setting_key, setting_value');

  if (error || !data) {
    throw new Error('Failed to load brand settings');
  }

  const settings: Record<string, unknown> = {};
  for (const row of data) {
    settings[row.setting_key] = row.setting_value;
  }

  return settings as unknown as BrandSettings;
}

// Load platform rules
export async function loadPlatformRules(platform?: string): Promise<PlatformRules[]> {
  let query = supabase.from('platform_rules').select('*');
  
  if (platform) {
    query = query.eq('platform', platform.toLowerCase());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to load platform rules');
  }

  return data || [];
}

// Apply branding to content for a specific platform
export async function brandContent(
  rawContent: string,
  platform: string,
  options: {
    includeHashtags?: boolean;
    includeCta?: boolean;
    includeFooter?: boolean;
    customHashtags?: string[];
    mediaUrls?: string[];
  } = {}
): Promise<BrandedContent> {
  const {
    includeHashtags = true,
    includeCta = false,
    includeFooter = false,
    customHashtags = [],
    mediaUrls = [],
  } = options;

  const brand = await loadBrandSettings();
  const rules = await loadPlatformRules(platform);
  const platformRule = rules[0];

  const warnings: string[] = [];
  let content = rawContent;

  // Select hashtags (respect platform limits)
  let hashtags: string[] = [];
  if (includeHashtags) {
    const allHashtags = [...customHashtags, ...brand.hashtags_primary];
    const maxHashtags = platformRule?.max_hashtags || 10;
    hashtags = allHashtags.slice(0, maxHashtags);
  }

  // Build final content based on platform
  const parts: string[] = [content];

  // Add CTA if requested
  if (includeCta && brand.cta_default) {
    parts.push('');
    parts.push(brand.cta_default);
  }

  // Add footer if requested
  if (includeFooter && brand.footer_text) {
    parts.push('');
    parts.push(brand.footer_text);
  }

  // Add hashtags (some platforms prefer them at the end)
  if (hashtags.length > 0) {
    // For Instagram, hashtags often go in first comment, but we'll include them
    // For LinkedIn, fewer hashtags is better
    if (platform === 'linkedin') {
      hashtags = hashtags.slice(0, 3);
    }
    parts.push('');
    parts.push(hashtags.join(' '));
  }

  let finalContent = parts.join('\n');
  let truncated = false;

  // Apply character limit
  const charLimit = platformRule?.character_limit;
  if (charLimit && finalContent.length > charLimit) {
    // Truncate content, keeping hashtags if possible
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
    const availableForContent = charLimit - hashtagString.length - 4; // 4 for "..."
    
    if (availableForContent > 50) {
      finalContent = rawContent.substring(0, availableForContent) + '...' + hashtagString;
      truncated = true;
      warnings.push(`Content truncated to ${charLimit} characters`);
    } else {
      // Content too long even without hashtags
      finalContent = rawContent.substring(0, charLimit - 3) + '...';
      truncated = true;
      hashtags = [];
      warnings.push(`Content heavily truncated, hashtags removed`);
    }
  }

  // Check media requirements
  const mediaIncluded = mediaUrls.length > 0;
  if (platformRule?.media_required && !mediaIncluded) {
    warnings.push(`${platform} requires media - post may fail without an image/video`);
  }

  // Check media count
  if (mediaUrls.length > (platformRule?.max_media_count || 10)) {
    warnings.push(`Too many media files - ${platform} allows max ${platformRule?.max_media_count}`);
  }

  return {
    platform,
    content: finalContent,
    hashtags,
    truncated,
    mediaIncluded,
    cta: includeCta ? brand.cta_default : null,
    characterCount: finalContent.length,
    characterLimit: charLimit,
    warnings,
  };
}

// Brand content for multiple platforms at once
export async function brandContentMultiPlatform(
  rawContent: string,
  platforms: string[],
  options: {
    includeHashtags?: boolean;
    includeCta?: boolean;
    includeFooter?: boolean;
    customHashtags?: string[];
    mediaUrls?: string[];
  } = {}
): Promise<Record<string, BrandedContent>> {
  const results: Record<string, BrandedContent> = {};

  for (const platform of platforms) {
    try {
      results[platform] = await brandContent(rawContent, platform, options);
    } catch (error) {
      results[platform] = {
        platform,
        content: rawContent,
        hashtags: [],
        truncated: false,
        mediaIncluded: false,
        cta: null,
        characterCount: rawContent.length,
        characterLimit: null,
        warnings: [`Failed to brand for ${platform}: ${error}`],
      };
    }
  }

  return results;
}

export default {
  loadBrandSettings,
  loadPlatformRules,
  brandContent,
  brandContentMultiPlatform,
};
