import { secretKey, publishableKey, supabaseUrl } from "@craudioviz/platform-sdk";
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

const SUPABASE_URL = supabaseUrl();
const SUPABASE_ANON_KEY = publishableKey();


/**
 * 2026-09-03: OPEN REDIRECT FIXED.
 *
 * The previous line was:
 *
 *   return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
 *
 * `new URL(x, base)` ignores the base entirely when x is absolute, so
 * ?redirect_to=https://attacker.example sent the freshly-authenticated visitor
 * straight there. Javari Verify found it by asking the endpoint to redirect
 * off-origin and reading where it actually pointed.
 *
 * This is the account-takeover class: an attacker sends a victim a link to THIS
 * domain, the victim signs in legitimately, and the code lands with the attacker.
 * Every visible signal in the flow says the site is genuine.
 *
 * Only a relative path is accepted now. Anything carrying a scheme, a host, a
 * backslash or a leading double slash falls back to "/" — a validator that tries
 * to CLEAN a hostile string keeps losing to the next encoding trick, so this one
 * only ever answers yes or no.
 */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/';
  // Must start with exactly one slash. Rejects https://evil, //evil and \evil.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  // A scheme anywhere is a rewritten absolute URL, whatever it starts with.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '/';
  if (raw.includes('\\')) return '/';
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = safeRedirectPath(requestUrl.searchParams.get('redirect_to'));

  if (code) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
