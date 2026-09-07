import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



// GET - List brand profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const brandId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    if (brandId) {
      const { data: brand, error } = await supabase
        .from('js_brand_profiles')
        .select('*')
        .eq('id', brandId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 404 });
      }

      return NextResponse.json({ brand });
    }

    const { data: brands, error } = await supabase
      .from('js_brand_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Check if agency (can have multiple brands)
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('plan, features')
      .eq('id', tenantId)
      .single();

    const canAddMore = tenant?.plan === 'agency' || (brands?.length || 0) < 1;

    return NextResponse.json({
      brands,
      canAddMore,
      isAgency: tenant?.plan === 'agency',
    });

  } catch (error) {
    console.error('Get brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create brand profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      name,
      companyName,
      tagline,
      websiteUrl,
      logoUrl,
      logoDarkUrl,
      primaryColor,
      secondaryColor,
      hashtagsPrimary,
      hashtagsSecondary,
      hashtagsForbidden,
      voiceDescription,
      toneKeywords,
      avoidKeywords,
      ctaTemplates,
      footerTemplate,
      platformOverrides,
    } = body;

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'tenantId and name required' }, { status: 400 });
    }

    // Check if agency or first brand
    const { data: tenant } = await supabase
      .from('js_tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    const { count: brandCount } = await supabase
      .from('js_brand_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (tenant?.plan !== 'agency' && (brandCount || 0) >= 1) {
      return NextResponse.json(
        { error: 'Multiple brand profiles require Agency plan. Upgrade to add more brands.' },
        { status: 403 }
      );
    }

    const isFirst = (brandCount || 0) === 0;

    const { data: brand, error } = await supabase
      .from('js_brand_profiles')
      .insert({
        tenant_id: tenantId,
        name,
        is_default: isFirst,
        company_name: companyName,
        tagline,
        website_url: websiteUrl,
        logo_url: logoUrl,
        logo_dark_url: logoDarkUrl,
        primary_color: primaryColor || '#6366f1',
        secondary_color: secondaryColor || '#8b5cf6',
        hashtags_primary: hashtagsPrimary || [],
        hashtags_secondary: hashtagsSecondary || [],
        hashtags_forbidden: hashtagsForbidden || [],
        voice_description: voiceDescription,
        tone_keywords: toneKeywords || [],
        avoid_keywords: avoidKeywords || [],
        cta_templates: ctaTemplates || [],
        footer_template: footerTemplate,
        platform_overrides: platformOverrides || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand });

  } catch (error) {
    console.error('Create brand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update brand profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, tenantId, setAsDefault, ...updates } = body;

    if (!brandId || !tenantId) {
      return NextResponse.json({ error: 'brandId and tenantId required' }, { status: 400 });
    }

    // Handle setting as default
    if (setAsDefault) {
      // Unset current default
      await supabase
        .from('js_brand_profiles')
        .update({ is_default: false })
        .eq('tenant_id', tenantId)
        .eq('is_default', true);

      updates.is_default = true;
    }

    const { data: brand, error } = await supabase
      .from('js_brand_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, brand });

  } catch (error) {
    console.error('Update brand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete brand profile
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!brandId || !tenantId) {
      return NextResponse.json({ error: 'id and tenantId required' }, { status: 400 });
    }

    // Check if it's the only brand
    const { count } = await supabase
      .from('js_brand_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if ((count || 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only brand profile. Create another first.' },
        { status: 400 }
      );
    }

    // Check if it's the default
    const { data: brand } = await supabase
      .from('js_brand_profiles')
      .select('is_default')
      .eq('id', brandId)
      .single();

    if (brand?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default brand. Set another as default first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('js_brand_profiles')
      .delete()
      .eq('id', brandId)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: 'The request could not be completed.', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Brand deleted' });

  } catch (error) {
    console.error('Delete brand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
