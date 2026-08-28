import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { 
  getBalance, 
  getTransactionHistory, 
  checkCredits,
  CREDIT_COSTS,
  type CreditAction 
} from '@/lib/credits';

function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}


// GET - Get user's credit balance and info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') as CreditAction | null;
    const includeHistory = searchParams.get('history') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get balance
    const balance = await getBalance(userId);
    
    // Build response
    const response: {
      balance: number;
      costs: typeof CREDIT_COSTS;
      canAfford?: { action: CreditAction; sufficient: boolean; required: number };
      history?: { transactions: unknown[]; total: number };
    } = {
      balance,
      costs: CREDIT_COSTS,
    };

    // Check specific action if requested
    if (action && CREDIT_COSTS[action]) {
      const check = await checkCredits(userId, action);
      response.canAfford = {
        action,
        sufficient: check.sufficient,
        required: check.required,
      };
    }

    // Include history if requested
    if (includeHistory) {
      response.history = await getTransactionHistory(userId, limit);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 });
  }
}

// POST - Add credits (for purchases, bonuses, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, source, metadata, adminKey } = body;

    // Validate admin key for credit additions
    const validAdminKey = process.env.ADMIN_API_KEY || 'cr-javari-admin-2025';
    if (adminKey !== validAdminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId || !amount || !source) {
      return NextResponse.json({ 
        error: 'userId, amount, and source required' 
      }, { status: 400 });
    }

    if (!['purchase', 'bonus', 'referral', 'promo', 'subscription'].includes(source)) {
      return NextResponse.json({ 
        error: 'Invalid source. Must be: purchase, bonus, referral, promo, or subscription' 
      }, { status: 400 });
    }

    // Import and use addCredits function
    const { addCredits } = await import('@/lib/credits');
    const result = await addCredits(userId, amount, source, metadata);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    });

  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
  }
}
