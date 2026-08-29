// lib/social/egress.ts — where this app is allowed to send things
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-29. CodeQL reported 13 critical js/request-forgery findings in this
// repo, all in app/api/social/* and app/api/admin/scheduler. None of the five
// social routes has any authentication and the repo has no middleware, so every
// one of them is an anonymous POST away from being used as a proxy.
//
// There are three distinct shapes here and they need three different answers.
//
// 1. A WEBHOOK URL SUPPLIED BY THE CALLER — discord, slack
//
//    `webhookUrl` went straight into fetch() with the caller's own JSON body.
//    That is a blind POST SSRF: an internal write endpoint reachable from the
//    deployment can be called with an arbitrary payload. Discord and Slack
//    webhooks live on known hosts, so these are PINNED. Anything else is
//    refused, which costs nothing real — a Discord webhook that is not on
//    discord.com is not a Discord webhook.
//
// 2. A SECRET INTERPOLATED INTO A FIXED HOST — telegram
//
//    `https://api.telegram.org/bot${botToken}/sendMessage`. The host is ours to
//    trust; the token is not. A token containing ../ walks to a different
//    endpoint and one containing ? or # truncates the path the code believed it
//    was calling. The host is pinned and the token is encoded as a single path
//    segment.
//
// 3. A HOST THE CALLER LEGITIMATELY CHOOSES — mastodon
//
//    Mastodon is federated; any instance is a valid destination, so there is no
//    host list to pin to and pretending otherwise would break the feature. What
//    can still be refused is everything that is not a public host: private and
//    loopback ranges, link-local including 169.254.169.254, .internal names,
//    and a name that resolves to any of those. That is what guardUrl does.
//
// AND ONE THAT IS NOT AN SSRF FINDING BUT IS THE WORST OF THEM
//
//    multi-post and admin/scheduler dispatched to themselves with
//    `request.nextUrl.origin`. That origin is built from the incoming request's
//    Host header, which the caller sets. `Host: attacker.example` makes this
//    server POST its own payload — including the bot tokens and webhook URLs in
//    that payload — to the attacker. selfOrigin() below reads the deployment's
//    own identity from the environment instead, so the caller has no say in it.
//
// CR AudioViz AI, LLC · EIN 39-3646201

import { guardUrl, urlSegment, EgressBlockedError } from '@craudioviz/platform-sdk/lib/egress-guard';

export { EgressBlockedError };

/** Discord webhooks. discordapp.com is the legacy host and still issued. */
const DISCORD_HOSTS = ['.discord.com', '.discordapp.com'] as const;
/** Slack incoming webhooks are only ever on hooks.slack.com. */
const SLACK_HOSTS = ['hooks.slack.com'] as const;
/** Telegram's Bot API. */
export const TELEGRAM_HOST = 'api.telegram.org';

async function assertAllowed(url: string, allowHosts?: readonly string[]): Promise<void> {
  const verdict = await guardUrl(url, allowHosts ? { allowHosts } : {});
  if (!verdict.allowed) throw new EgressBlockedError(verdict.reason);
}

/** A Discord webhook URL, or a refusal. */
export async function assertDiscordWebhook(url: string): Promise<void> {
  await assertAllowed(url, DISCORD_HOSTS);
}

/** A Slack incoming-webhook URL, or a refusal. */
export async function assertSlackWebhook(url: string): Promise<void> {
  await assertAllowed(url, SLACK_HOSTS);
}

/**
 * Build a Telegram Bot API URL with the token as one encoded path segment.
 *
 * The shape check is Telegram's own: digits, a colon, then 35 URL-safe
 * characters. A value that is not a bot token cannot become a path.
 */
const TELEGRAM_TOKEN = /^\d{5,16}:[A-Za-z0-9_-]{30,45}$/;

export function telegramUrl(botToken: string, method: string): string {
  const token = urlSegment(botToken, TELEGRAM_TOKEN);
  const safeMethod = urlSegment(method, /^[a-zA-Z]{2,32}$/);
  return `https://${TELEGRAM_HOST}/bot${token}/${safeMethod}`;
}

/**
 * A Mastodon instance host, or a refusal.
 *
 * The caller passes a bare host ("mastodon.social"). It is rebuilt into an
 * https URL here rather than trusted as one, so a value carrying a path, a
 * query, a port or embedded credentials cannot smuggle any of that through.
 */
export async function assertMastodonInstance(instance: string): Promise<string> {
  const host = instance.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!/^[a-z0-9.-]+$/i.test(host) || host.includes('..')) {
    throw new EgressBlockedError(`"${host.slice(0, 40)}" is not a plain hostname.`);
  }
  const url = `https://${host}`;
  await assertAllowed(url);
  return host;
}

/**
 * This deployment's own origin, from the environment — never from the request.
 *
 * `request.nextUrl.origin` is derived from the Host header the caller sent, so
 * a route that self-dispatches with it will post its own payload wherever the
 * caller points it. On Vercel the deployment knows its own hostname; locally
 * the fallback is the loopback address the dev server actually listens on.
 */
export function selfOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return `http://127.0.0.1:${process.env.PORT || 3000}`;
}
