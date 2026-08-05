// lib/platform-sdk.ts
// ─────────────────────────────────────────────────────────────────────────────
// Javari Platform SDK — Standard integration for ALL apps
// Every app imports this to get: OAuth, payments, credits, AI, user management
//
// Pattern:
//   import { PlatformSDK } from '@/lib/platform-sdk'
//   const sdk = new PlatformSDK()
//   const user = await sdk.auth.getUser(req)
//   await sdk.credits.spend(user.id, 5, 'resume_generation')
//
// craudiovizai.com handles ALL backend logic — apps are just thin clients
// Created: May 15, 2026
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_URL = process.env.NEXT_PUBLIC_CENTRAL_API_URL
  ?? process.env.PLATFORM_URL
  ?? 'https://craudiovizai.com'

const PLATFORM_KEY = process.env.PLATFORM_API_KEY ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// Core platform fetch — authenticated to craudiovizai.com
// ─────────────────────────────────────────────────────────────────────────────

async function platformFetch(
  endpoint:   string,
  options:    RequestInit = {},
  authToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type':     'application/json',
    'X-App-Origin':     process.env.NEXT_PUBLIC_APP_NAME ?? 'javari-app',
    ...(PLATFORM_KEY  ? { 'X-Platform-Key': PLATFORM_KEY } : {}),
    ...(authToken     ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  return fetch(`${PLATFORM_URL}/api${endpoint}`, {
    ...options,
    headers,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth module — delegates to craudiovizai.com OAuth
// ─────────────────────────────────────────────────────────────────────────────

export const auth = {
  // Get current user from session token
  async getUser(authToken: string): Promise<{
    id: string; email: string; name?: string; tier: string; credits: number
  } | null> {
    try {
      const res = await platformFetch('/auth/me', {}, authToken)
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  // Verify a user token
  async verify(token: string): Promise<boolean> {
    try {
      const res = await platformFetch('/auth/verify', {
        method: 'POST',
        body:   JSON.stringify({ token }),
      })
      return res.ok
    } catch { return false }
  },

  // Get OAuth login URL (redirects to craudiovizai.com OAuth)
  getLoginUrl(provider: 'google' | 'github' | 'apple' = 'google', returnTo?: string): string {
    const params = new URLSearchParams({
      provider,
      app: process.env.NEXT_PUBLIC_APP_NAME ?? 'javari-app',
      ...(returnTo ? { return_to: returnTo } : {}),
    })
    return `${PLATFORM_URL}/auth/oauth?${params.toString()}`
  },

  // Sign out
  async signOut(authToken: string): Promise<void> {
    await platformFetch('/auth/signout', { method: 'POST' }, authToken)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Credits module — track and deduct credits
// ─────────────────────────────────────────────────────────────────────────────

export const credits = {
  // Get user's credit balance
  async getBalance(userId: string, authToken?: string): Promise<{
    balance: number; tier: string; never_expires: boolean
  }> {
    try {
      const res = await platformFetch(`/credits/balance?user_id=${userId}`, {}, authToken)
      if (!res.ok) return { balance: 0, tier: 'free', never_expires: false }
      return res.json()
    } catch { return { balance: 0, tier: 'free', never_expires: false } }
  },

  // Spend credits for an action
  async spend(
    userId:   string,
    amount:   number,
    action:   string,
    appId?:   string,
    authToken?: string,
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      // Fixed 2026-08-01: the real endpoint reads app_id from an x-app-id
      // HEADER, not the request body, and expects { amount, description } -
      // same bug found and fixed in two other shared-service files tonight.
      const res = await platformFetch('/credits/spend', {
        method: 'POST',
        headers: { 'x-app-id': appId ?? 'unknown' },
        body:   JSON.stringify({ amount, description: action }),
      }, authToken)
      if (!res.ok) {
        const err = await res.json()
        return { success: false, newBalance: 0, error: err.error ?? 'Insufficient credits' }
      }
      return res.json()
    } catch (err) {
      return { success: false, newBalance: 0, error: String(err) }
    }
  },

  // Check if user has enough credits (without spending)
  async check(userId: string, amount: number, authToken?: string): Promise<boolean> {
    const { balance } = await credits.getBalance(userId, authToken)
    return balance >= amount
  },

  // Grant credits (for admins, social impact programs, etc.)
  async grant(
    userId:   string,
    amount:   number,
    reason:   string,
    authToken?: string,
  ): Promise<boolean> {
    // Fixed 2026-08-01: /api/credits/grant did not exist at all (confirmed
    // 404) - this function has always failed silently. Built the real
    // endpoint (admin-only, uses the real cl_grant RPC) alongside this fix.
    try {
      const res = await platformFetch('/credits/grant', {
        method: 'POST',
        body:   JSON.stringify({ user_id: userId, amount, reason }),
      }, authToken)
      return res.ok
    } catch { return false }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments module — Stripe via craudiovizai.com
// ─────────────────────────────────────────────────────────────────────────────

export const payments = {
  // Create a Stripe checkout session
  // Fixed 2026-08-01: sent { price_id } to an endpoint that reads
  // { mode, tierId/productId } - every checkout through this function has
  // failed since it was written. Now sends the real, correct shape.
  async createCheckout(params: {
    userId:     string
    priceId:    string   // interpreted as a real tier id (creator/pro/business/enterprise) or a real credit_packs.id
    isOneTime?: boolean
    successUrl: string
    cancelUrl:  string
    authToken?: string
  }): Promise<{ url: string; sessionId: string } | null> {
    try {
      const res = await platformFetch('/payments/create-checkout', {
        method: 'POST',
        body:   JSON.stringify(params.isOneTime ? {
          mode: 'payment', productId: params.priceId,
          successUrl: params.successUrl, cancelUrl: params.cancelUrl,
        } : {
          mode: 'subscription', tierId: params.priceId,
          successUrl: params.successUrl, cancelUrl: params.cancelUrl,
        }),
      }, params.authToken)
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  // Get subscription status - fixed 2026-08-01: the real endpoint resolves
  // the user from the Bearer token itself, not a user_id query param.
  async getSubscription(userId: string, authToken?: string): Promise<{
    status:     string
    tier:       string
    renewsAt?:  string
    cancelAt?:  string
  } | null> {
    try {
      const res = await platformFetch(`/payments/subscription`, {}, authToken)
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  // Fixed 2026-08-01: every one of these six price IDs was confirmed
  // archived or entirely fake (price_credits_100/500/1000 were never real
  // Stripe IDs at all). Also missing the real creator/enterprise tiers.
  // Real, currently-active, tagged prices confirmed directly against Stripe.
  PRICES: {
    creator_monthly:    process.env.STRIPE_CREATOR_PRICE_ID    ?? 'price_1TxXiO7YeQ1dZTUvwgT23pvs',
    pro_monthly:        process.env.STRIPE_PRO_PRICE_ID        ?? 'price_1TxXiP7YeQ1dZTUvxsIrPlWU',
    business_monthly:   process.env.STRIPE_BUSINESS_PRICE_ID   ?? 'price_1TxXiP7YeQ1dZTUv3oHHLsYZ',
    enterprise_monthly: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_1TxXiQ7YeQ1dZTUve0R0Sbaa',
  },

  // Fixed 2026-08-01: these numbers (100/500/1000/5000 credits) never
  // matched any real product - the real credit_packs database table holds
  // a completely different set. Real packs, fetch live from /api/pricing
  // for the current list rather than hold a static copy here.
  CREDIT_PACKAGES: [] as { credits: number; price: number; id: string }[],
}

// ─────────────────────────────────────────────────────────────────────────────
// AI module — call Javari AI from any app
// ─────────────────────────────────────────────────────────────────────────────

export const ai = {
  // 2026-08-04: REWRITTEN. This used to call the AI providers
  // DIRECTLY, with this app own provider keys from this app's own
  // environment.
  //
  // That bypassed everything the platform exists to provide: the COST LAW
  // cascade, the credit ledger, the safety content guard, knowledge retrieval
  // and the craft patterns. This app charged nothing, protected nobody, and
  // asked for deepseek-v4-flash — retired, and returning 404.
  //
  // Now the platform's OpenAI-compatible endpoint. Same request shape, one URL.
  async generate(params: {
    prompt:     string
    system?:    string
    model?:     string
    maxTokens?: number
  }): Promise<string> {
    const base = process.env.NEXT_PUBLIC_CENTRAL_API_URL ?? 'https://craudiovizai.com'
    try {
      const res = await fetch(`${base}/api/v1/chat/completions`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': process.env.NEXT_PUBLIC_APP_NAME ?? 'satellite',
        },
        body: JSON.stringify({
          // params.model is deliberately NOT sent. COST LAW decides on the
          // platform side; an app naming a model does not override the cascade,
          // and that is the spend this change exists to control.
          max_tokens: params.maxTokens ?? 2048,
          messages: [
            ...(params.system ? [{ role: 'system', content: params.system }] : []),
            { role: 'user', content: params.prompt },
          ],
        }),
      })
      if (!res.ok) {
        console.error('[sdk.ai] platform returned', res.status)
        return ''
      }
      const d = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      return d.choices?.[0]?.message?.content ?? ''
    } catch (err) {
      console.error('[sdk.ai] generate failed:', err instanceof Error ? err.message : err)
      return ''
    }
  },

  // Execute a multi-agent team task
  async executeTeam(params: {
    objective:  string
    callerKey?: string
  }): Promise<string> {
    const key = params.callerKey ?? process.env.JAVARI_CALLER_KEY ?? ''
    const plan = {
      plan_id:              `sdk-${Date.now()}`,
      created_at:           new Date().toISOString(),
      total_estimated_cost: 0,
      tasks: [{
        id: 'task-1', role: 'builder', objective: params.objective,
        inputs: [], outputs: ['result'], dependencies: [],
        model: 'deepseek/deepseek-v4-flash:free',
        max_cost: 0, status: 'pending',
      }],
    }

    const javariUrl = process.env.JAVARI_AI_URL ?? 'https://javariai.com'
    const res = await fetch(`${javariUrl}/api/execute`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-javari-caller-key': key },
      body:    JSON.stringify(plan),
    })

    if (!res.ok || !res.body) throw new Error('Team execution failed')

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = '', result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(part.slice(6))
          if (evt.type === 'task_complete') {
            const out = evt.result?.output ?? ''
            try { const p = JSON.parse(out); result = p.artifact ?? p.result ?? out }
            catch { result = out }
          }
        } catch { /* skip */ }
      }
    }

    return result
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics module — track events
// ─────────────────────────────────────────────────────────────────────────────

export const analytics = {
  async track(event: string, properties?: Record<string, unknown>): Promise<void> {
    try {
      await platformFetch('/analytics/track', {
        method: 'POST',
        body:   JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
      })
    } catch { /* non-fatal */ }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: check if a user can perform an action (auth + credits check)
// ─────────────────────────────────────────────────────────────────────────────

export async function canPerformAction(
  authToken:    string,
  creditCost:   number,
  action:       string,
): Promise<{ allowed: boolean; user?: { id: string; email: string }; reason?: string }> {
  const user = await auth.getUser(authToken)
  if (!user) return { allowed: false, reason: 'Authentication required' }

  if (creditCost === 0) return { allowed: true, user }

  const hasCredits = await credits.check(user.id, creditCost, authToken)
  if (!hasCredits) return { allowed: false, user, reason: `Insufficient credits (need ${creditCost})` }

  return { allowed: true, user }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — the Platform SDK
// ─────────────────────────────────────────────────────────────────────────────

export const PlatformSDK = {
  auth,
  credits,
  payments,
  ai,
  analytics,
  canPerformAction,
  PLATFORM_URL,
}

export default PlatformSDK
