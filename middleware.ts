// middleware.ts — nothing under /api/social or /api/admin is public
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY
//
// 2026-08-29. Commit 5fdab5d fixed where these routes are allowed to SEND
// things — Discord and Slack webhooks pinned to their real hosts, the Telegram
// bot token encoded as a single path segment, Mastodon instances checked
// against private and link-local ranges, and self-dispatch taken off the
// caller-controlled Host header.
//
// It did not fix WHO is allowed to ask. Every one of the nine routes under
// /api/social is an anonymous POST, and this repo had no middleware, so the
// pinning turned "post anything anywhere" into "post anything to Discord,
// Slack, Telegram and Mastodon". That is a smaller hole, not a closed one:
// the routes still hold the bot tokens and webhook URLs, and anyone on the
// internet could still make them speak in our name, at any volume they liked.
//
// Pinning answers "where". This answers "who". Both were needed.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY A SHARED SECRET AND NOT A USER SESSION
//
// Nothing in this repository calls these routes. Every reference outside
// app/api is a build artefact under .next/types — there is no page, component
// or hook that posts to them, and the repo has no session library. They are
// machine-to-machine endpoints with no human in the loop, so a header secret
// is the honest gate. A login screen in front of an endpoint no browser ever
// reaches would be theatre.
//
// If a signed-in UI is ever built on top of these, this is the file to change,
// and the change is additive: accept a session OR the secret.
//
// ─────────────────────────────────────────────────────────────────────────────
// IT FAILS CLOSED
//
// requireAdminSecret refuses EVERY request with 503 when INTERNAL_API_SECRET is
// unset or under 16 characters. That is deliberate and is the whole point of
// using it: the defect it was written for was a gate that fell back to a
// default published in its own source. An unset gate must refuse, not welcome.
//
// So if INTERNAL_API_SECRET is not set on this project, these routes answer 503
// until it is. That is strictly better than what they do today, which is
// whatever the caller asks.
//
// Matched by prefix, so a route added under either path tomorrow is covered
// without anyone remembering to come back here. That is the actual fix — the
// six-route version of this defect recurred precisely because nothing stopped
// it recurring.
//
// CR AudioViz AI, LLC · EIN 39-3646201

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminSecret } from '@craudioviz/platform-sdk/lib/require-admin-secret';

export function middleware(req: NextRequest) {
  const denied = requireAdminSecret(req, 'INTERNAL_API_SECRET');
  if (denied) return denied;
  return NextResponse.next();
}

export const config = {
  // Only the two API trees. The marketing site itself stays public — this must
  // never become a gate on the pages people are meant to read.
  matcher: ['/api/social/:path*', '/api/admin/:path*'],
};
