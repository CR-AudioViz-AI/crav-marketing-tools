import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ============================================================================
// CR AUDIOVIZ AI - CENSUS DEMOGRAPHICS API
// GET /api/census - Get demographics by ZIP code (Pro feature)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCensusDataByZip } from '@/lib/free-apis';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}



export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json(
      { success: false, error: 'ZIP code is required' },
      { status: 400 }
    );
  }

  // Validate ZIP code format
  if (!/^\d{5}$/.test(zipCode)) {
    return NextResponse.json(
      { success: false, error: 'Invalid ZIP code format. Must be 5 digits.' },
      { status: 400 }
    );
  }

  // Check user authentication and tier
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;
  let userTier = 'starter';

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;

      // Get user subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      userTier = profile?.subscription_tier || 'starter';
    }
  }

  // Census data is a Pro feature
  if (userTier === 'starter') {
    return NextResponse.json(
      {
        success: false,
        error: 'Census demographics is a Pro feature',
        upgradeUrl: '/pricing',
        preview: {
          zipCode,
          message: 'Upgrade to Pro to see demographics for this ZIP code',
          features: [
            'Population & median age',
            'Median household income',
            'Education levels',
            'Home ownership rates',
            'AI-powered marketing insights',
          ],
        },
      },
      { status: 403 }
    );
  }

  // Check monthly usage for Pro users (100 lookups/month)
  if (userTier === 'pro' && userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await supabase
      .from('census_lookups')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if ((count || 0) >= 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Monthly Census lookup limit reached (100/month). Upgrade to Enterprise for unlimited.',
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }
  }

  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('census_cache')
      .select('data, cached_at')
      .eq('zip_code', zipCode)
      .single();

    // Use cache if less than 30 days old
    const cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (cached && Date.now() - new Date(cached.cached_at).getTime() < cacheExpiry) {
      // Log usage
      if (userId) {
        await supabase.from('census_lookups').insert({
          user_id: userId,
          zip_code: zipCode,
          from_cache: true,
        });
      }

      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        meta: {
          zipCode,
          cachedAt: cached.cached_at,
        },
      });
    }

    // Fetch fresh data from Census API
    const censusData = await getCensusDataByZip(zipCode);

    if (!censusData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No data found for this ZIP code',
          suggestion: 'This ZIP code may not exist or have insufficient data',
        },
        { status: 404 }
      );
    }

    // Cache the result
    await supabase.from('census_cache').upsert({
      zip_code: zipCode,
      data: censusData,
      cached_at: new Date().toISOString(),
    });

    // Log usage
    if (userId) {
      await supabase.from('census_lookups').insert({
        user_id: userId,
        zip_code: zipCode,
        from_cache: false,
      });
    }

    return NextResponse.json({
      success: true,
      data: censusData,
      cached: false,
      meta: {
        zipCode,
        source: 'US Census Bureau - American Community Survey',
        dataYear: '2022',
      },
    });
  } catch (error) {
    console.error('Census API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Census data' },
      { status: 500 }
    );
  }
}

// Batch lookup endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCodes } = body;

    if (!zipCodes || !Array.isArray(zipCodes)) {
      return NextResponse.json(
        { success: false, error: 'zipCodes array is required' },
        { status: 400 }
      );
    }

    if (zipCodes.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 ZIP codes per request' },
        { status: 400 }
      );
    }

    // Check authentication (Pro feature)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for batch lookup' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Fetch all ZIP codes in parallel
    const results = await Promise.all(
      zipCodes.map(async (zip: string) => {
        try {
          const data = await getCensusDataByZip(zip);
          return { zipCode: zip, success: true, data };
        } catch {
          return { zipCode: zip, success: false, error: 'Failed to fetch' };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
      meta: {
        requested: zipCodes.length,
        successful: results.filter((r) => r.success).length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Batch census error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch request' },
      { status: 500 }
    );
  }
}
