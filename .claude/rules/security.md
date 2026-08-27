---
paths:
  - "src/app/**"
  - ".env*"
  - "supabase/**"
  - "next.config.*"
---

# Security Rules

## Secrets Management
- NEVER commit secrets, API keys, or credentials to git
- Use `.env.local` for local development (already in .gitignore)
- Use `NEXT_PUBLIC_` prefix ONLY for values safe to expose in browser
- Document all required env vars in `.env.local.example` with dummy values

## Handling `.env.local` (don't fight the permissions)
- **Never read, edit, or create `.env.local`** (or any real `.env*.local`) — these hold the user's private keys and are permission-blocked. If a write is denied, do **not** retry it; that's by design.
- **`.env.local.example` is the one env file you may read and write.** When a feature needs a new variable, add a **placeholder** line there (dummy value) so it's documented.
- **To put a real value into `.env.local`, ask the user in chat** — state the exact key and where to get the value (e.g. "Add `NEXT_PUBLIC_SUPABASE_URL=…` to your `.env.local` — it's the API URL from `supabase start`"). The user pastes it themselves. Never try to write the real value yourself.

## Input Validation
- Validate ALL user input on the server side with Zod
- Never trust client-side validation alone
- Sanitize data before database insertion

## Authentication
- Always verify authentication before processing API requests
- Use Supabase RLS as a second line of defense
- **Rate-limit anything that checks a credential — login, signup, password reset, magic link, OTP, invite codes.** An unlimited login is a working login that anyone can guess their way into, so this is part of building auth, never a later hardening step. Supabase Auth limits its own endpoints per IP (`/auth/v1/token`, `/auth/v1/verify`; not customizable) and lets you tune the email/OTP/reset limits under **Authentication → Rate Limits** (locally: `[auth.rate_limit]` in `supabase/config.toml`) — but that does not cover a distributed attack, credential stuffing, or any auth route you wrote yourself. Those need an app-level throttle keyed per IP **and** per account (`docs/production/rate-limiting.md`), plus CAPTCHA on public forms (`[auth.captcha]`, hCaptcha or Turnstile).
- Never reveal whether an account exists — the same error message for an unknown email and a wrong password. Enumeration is what turns a brute-force attempt into an efficient one.
- Auth/login forms must submit via POST — a Next.js Server Action (`<button formAction={…}>` with a `'use server'` handler), or a client `onSubmit` that calls `preventDefault()`. Never let a form with credentials submit natively (GET).

## Sensitive Data in URLs
- NEVER put credentials, tokens, session IDs, or PII in a URL or query string — they leak into browser history, server logs, and `Referer` headers
- Forms carrying sensitive fields (password, email + password, tokens) must POST, never GET
- A URL like `/login?email=…&password=…` is always a bug — it means a form submitted as native GET instead of through a Server Action or a `preventDefault()` handler

## Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- Strict-Transport-Security with includeSubDomains

## Code Review Triggers
- Any changes to RLS policies require explicit user approval
- Any changes to authentication flow require explicit user approval
- Any new environment variables must be documented in .env.local.example
