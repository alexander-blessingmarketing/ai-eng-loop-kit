# Rate Limiting

Prevent abuse, DDoS attacks, and excessive API usage.

## When to Add Rate Limiting
- **Anything that checks a credential — login, signup, password reset, invite codes: from the start, MVP included.** An unlimited login can be guessed at machine speed, and every attempt looks like a normal request in your logs. This one isn't a "later, when we have users" item; by then you have accounts worth stealing.
- **MVP, everything else:** optional — focus on features first.
- **Public-facing APIs:** required.

## Supabase Auth: what you already have

If your login runs through Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`), some protection is already on:

- **Per-IP limits** on token requests (`/auth/v1/token` — that's password sign-in) and verification requests. These are **not customizable**.
- **Customizable limits** for email sends, OTPs, signup confirmation, and password resets — hosted: **Authentication → Rate Limits** in the dashboard; locally: `[auth.rate_limit]` in `supabase/config.toml`.

What that does **not** cover, and what you still have to do:

- **A distributed attack** (rotating IPs) or **credential stuffing** (one common password against many accounts) — per-IP counting doesn't see either.
- **Your own auth code** — a custom login route, a server action checking an invite code or a shared password gets no Supabase limit at all. Rate-limit it yourself with the Upstash setup below, keyed by **IP and account** (`ratelimit.limit("login:" + email)` alongside the IP key), so one attacker can't spread attempts across IPs against a single account.

**Turn these on while you're in there** (dashboard → Authentication → Attack Protection):
- **CAPTCHA** on sign-in / sign-up / password-reset forms — hCaptcha or Cloudflare Turnstile (locally `[auth.captcha]`). The strongest lever against automated guessing on the built-in endpoints.
- **Leaked-password protection** — rejects passwords known from breaches via HaveIBeenPwned (paid plans), plus a minimum length of at least 8 and required character classes.
- Give the same error message for "unknown email" and "wrong password" — otherwise an attacker can first collect valid addresses and then only guess passwords for those.

## Setup with Upstash Redis

### 1. Install Dependencies
```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Create Upstash Account
- Go to [upstash.com](https://upstash.com) (free tier: 10k requests/day)
- Create a Redis database
- Copy REST URL and token

### 3. Add Environment Variables
```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### 4. Create Rate Limiter
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})
```

### 5. Use in API Routes
```typescript
// src/app/api/example/route.ts
import { ratelimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success, limit, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
  }

  // Process request normally...
}
```

### 6. Use in Middleware (Global)
```typescript
// middleware.ts
import { ratelimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
  }
}

export const config = {
  matcher: '/api/:path*',
}
```

## Recommended Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login/Register | 5 requests | 1 minute |
| Password Reset | 3 requests | 5 minutes |
| General API | 30 requests | 10 seconds |
| File Upload | 5 requests | 1 minute |

## Where rate limiting can live (two layers)

Rate limiting can happen at two different layers — they complement each other, they don't replace each other:

- **Application layer (Upstash, the setup above).** Runs inside your code, so it knows *who* and *what*: "5 login attempts per user", "30 API calls per IP". Fine-grained, per-route, per-user. **Works on any host** (Vercel *and* Hostinger) because it's just code + a Redis call.
- **Edge / network layer (Cloudflare, host firewall).** Runs *in front of* your app, so it blocks abuse before it ever reaches your server — including volumetric DDoS that app-layer limiting can't stop (the request still hit your server to be counted).

### Alternatives to Upstash
- **Cloudflare (recommended if you want broad protection with little code).** Put your domain behind Cloudflare's free plan: you get DDoS protection and bot mitigation automatically, plus **Rate Limiting Rules** you configure in the dashboard (no code) — e.g. "block an IP that hits `/api/login` more than 5×/min". Host-agnostic. Best for coarse, IP-based protection. It does *not* know your app's user IDs, so for per-user business rules you still want Upstash.
- **Vercel WAF / Firewall** (Vercel only) — dashboard-configured rate-limiting rules at the edge. Good if you're on Vercel and don't want an external service, but doesn't help on Hostinger.

**Rule of thumb:** Cloudflare in front (free, stops the crude attacks) **+** Upstash in the app (for "5 login tries per account" type rules) is the belt-and-suspenders setup for a real SaaS. For an MVP, either one alone is already a big step up from nothing.
