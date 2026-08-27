# Security Headers Configuration

Protect against XSS, Clickjacking, MIME sniffing, and other common web attacks.

## Setup

Add security headers to `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

## What Each Header Does

| Header | Protection |
|--------|-----------|
| X-Frame-Options: DENY | Prevents your site from being embedded in iframes (clickjacking) |
| X-Content-Type-Options: nosniff | Prevents browsers from guessing content types (MIME sniffing) |
| Referrer-Policy | Controls how much URL info is sent to other sites |
| Strict-Transport-Security | Forces HTTPS connections |

## Verify After Deployment
1. Open Chrome DevTools
2. Go to Network tab
3. Click on any request to your site
4. Check Response Headers section
5. Verify all 4 headers are present

## Advanced (Optional)

**Content-Security-Policy (CSP)** — the most powerful header against XSS, and the easiest to get wrong. It is not part of the four above because it needs per-app testing; add it once the rest is live.

> ⚠️ **Never ship `script-src 'self' 'unsafe-inline'`.** `'unsafe-inline'` permits exactly the injected inline `<script>` that CSP exists to stop — it looks like protection while giving away most of it. If you find that value in a tutorial (it is a very common copy-paste), treat it as broken.

Next.js needs a **nonce** instead: a random token generated per request, attached to the scripts your app legitimately renders. Anything injected by an attacker lacks the token and is blocked. That means it belongs in middleware, not in `next.config.ts`:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
```

`'strict-dynamic'` lets scripts your nonced code loads run too, so you don't have to list every CDN. `'unsafe-eval'` is dev-only — React's fast refresh needs it; it must never reach production.

**Rolling it out safely:**
1. Ship it as `Content-Security-Policy-Report-Only` first — the browser reports violations without breaking anything
2. Click through the app, watch the console for violation reports, and fix what's genuinely yours
3. Only then switch the header name to `Content-Security-Policy`

**Caveats worth knowing before you start:**
- Nonces force **dynamic rendering** — a statically prerendered page has no per-request token. Pages that need one must opt in with `await connection()` from `next/server`.
- Third-party scripts (analytics, tag managers) need the nonce passed explicitly — read it with `(await headers()).get('x-nonce')`.

Reference: [Next.js — Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
