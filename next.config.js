// Build trigger: 1779135717
/** @type {import("next").NextConfig} */
const nextConfig={
      async headers() {
        // 2026-09-02: added after an ecosystem sweep found 58 of 60 live sites with
        // no CSP and weak or absent HSTS. This project had no headers() at all.
        //
        // HSTS is enforced immediately - it only tells the browser to refuse
        // plaintext, so there is nothing for it to break. CSP ships REPORT-ONLY
        // first: a policy that blocks a script the app needs takes the app down,
        // and it graduates to enforcing once the violation reports are quiet.
        return [
          {
            source: '/:path*',
            headers: [
              { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
              { key: 'Content-Security-Policy-Report-Only', value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.paypal.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.paypal.com; frame-src 'self' https://js.stripe.com https://*.paypal.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` },
              { key: 'X-Frame-Options', value: 'DENY' },
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            ],
          },
        ];
      },

  // 2026-08-29: required for @craudioviz/platform-sdk. The SDK ships raw
  // TypeScript and Next does not run node_modules through SWC by default, so
  // any import carrying a `type` re-export fails the build without this.
  transpilePackages: ["@craudioviz/platform-sdk"],typescript:{ignoreBuildErrors:true},eslint:{ignoreDuringBuilds:true},reactStrictMode:false}

// 2026-08-30: Next 15 compiles instrumentation.ts for the EDGE runtime as well
// as node, so the vault env-shim's `crypto` import is pulled into an edge
// bundle even though register() returns early off nodejs. Marking it
// unavailable for the edge compilation is what stops it. The import must stay
// a BARE `crypto` specifier: webpack rejects the `node:` scheme before
// resolve.fallback is ever consulted, so `node:crypto` fails here too.

// 2026-09-05 Next 16: webpack config removed.
//
// Turbopack is the default builder in Next 16 and refuses to start when a
// webpack config exists with no turbopack equivalent.
//
// This block existed only to disable the crypto fallback on the edge runtime.
// It is scaffolding for a problem Turbopack does not have: node:crypto resolves
// correctly on edge. Proven on javari-logo and javari-forge, both of which built
// and deployed on 16.3.4 with it deleted.
//
// Thirty-seven repos carried a byte-identical copy - one sha256 across all of
// them - so this is one fix applied thirty-seven times, not thirty-seven fixes.
module.exports = { ...nextConfig };
