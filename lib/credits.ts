import { secretKey, supabaseUrl } from "@craudioviz/platform-sdk";


function getSupabase() {
  var sb = require('@supabase/supabase-js')
  var url = supabaseUrl()
  var key = secretKey()
  if (!url || !key) return null
  return sb.createClient(url, key, { auth: { persistSession: false } })
}

// Credit costs per action
export const CREDIT_COSTS = {
  // Social publishing
  social_post_basic: 1,        // Single platform post
  social_post_multi: 2,        // Multi-platform (3+)
  social_post_scheduled: 1,    // Scheduled post (on publish)
  social_analytics: 5,         // Analytics report

  // AI tools
  ai_chat_basic: 1,            // Basic AI response
  ai_chat_advanced: 3,         // Complex/long response
  ai_image_generate: 5,        // Image generation
  ai_document_analyze: 3,      // Document analysis

  // Document tools
  pdf_create: 2,
  pdf_merge: 1,
  pdf_convert: 2,
  ebook_create: 10,
  presentation_create: 5,

  // Marketing tools
  email_template: 2,
  logo_generate: 5,
  social_graphic: 3,
};

export type CreditAction = keyof typeof CREDIT_COSTS;

interface CreditResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  transactionId?: string;
}

/**
 * Check if user has enough credits for an action
 */
export async function checkCredits(userId: string, action: CreditAction): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const required = CREDIT_COSTS[action];
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  const balance = profile?.credits_balance || 0;
  
  return {
    sufficient: balance >= required,
    balance,
    required,
  };
}

/**
 * Deduct credits for an action
 */
export async function deductCredits(
  userId: string,
  action: CreditAction,
  metadata?: Record<string, unknown>
): Promise<CreditResult> {
  const cost = CREDIT_COSTS[action];
  
  // Get current balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' };
  }

  const currentBalance = profile.credits_balance || 0;
  
  if (currentBalance < cost) {
    return { 
      success: false, 
      error: `Insufficient credits. Required: ${cost}, Available: ${currentBalance}` 
    };
  }

  const newBalance = currentBalance - cost;
  
  // Start transaction
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Record transaction first
  const { error: txnError } = await supabase
    .from('credit_transactions')
    .insert({
      id: transactionId,
      user_id: userId,
      type: 'deduction',
      amount: -cost,
      action,
      balance_before: currentBalance,
      balance_after: newBalance,
      metadata,
      created_at: new Date().toISOString(),
    });

  if (txnError) {
    console.error('Transaction record failed:', txnError);
    // Continue anyway - balance update is more important
  }

  // Update balance
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    // Attempt to rollback transaction record
    await supabase
      .from('credit_transactions')
      .delete()
      .eq('id', transactionId);
      
    return { success: false, error: 'Failed to update balance' };
  }

  return {
    success: true,
    newBalance,
    transactionId,
  };
}

/**
 * Refund credits (for failed operations)
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  originalTransactionId?: string
): Promise<CreditResult> {
  // Get current balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' };
  }

  const currentBalance = profile.credits_balance || 0;
  const newBalance = currentBalance + amount;
  
  const transactionId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Record refund transaction
  await supabase
    .from('credit_transactions')
    .insert({
      id: transactionId,
      user_id: userId,
      type: 'refund',
      amount: amount,
      action: 'refund',
      balance_before: currentBalance,
      balance_after: newBalance,
      metadata: { reason, original_transaction_id: originalTransactionId },
      created_at: new Date().toISOString(),
    });

  // Update balance
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    return { success: false, error: 'Failed to update balance' };
  }

  return {
    success: true,
    newBalance,
    transactionId,
  };
}

/**
 * Add credits (purchase, bonus, etc.)
 */
export async function addCredits(
  userId: string,
  amount: number,
  source: 'purchase' | 'bonus' | 'referral' | 'promo' | 'subscription',
  metadata?: Record<string, unknown>
): Promise<CreditResult> {
  // Get current balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' };
  }

  const currentBalance = profile.credits_balance || 0;
  const newBalance = currentBalance + amount;
  
  const transactionId = `add_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Record addition transaction
  await supabase
    .from('credit_transactions')
    .insert({
      id: transactionId,
      user_id: userId,
      type: 'addition',
      amount: amount,
      action: source,
      balance_before: currentBalance,
      balance_after: newBalance,
      metadata,
      created_at: new Date().toISOString(),
    });

  // Update balance
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    return { success: false, error: 'Failed to update balance' };
  }

  return {
    success: true,
    newBalance,
    transactionId,
  };
}

/**
 * Get credit balance
 */
export async function getBalance(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  return profile?.credits_balance || 0;
}

/**
 * Get credit transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ transactions: unknown[]; total: number }> {
  const { data, count } = await supabase
    .from('credit_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return {
    transactions: data || [],
    total: count || 0,
  };
}
