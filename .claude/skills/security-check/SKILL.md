---
name: security-check
description: Non-destructive security check of your LIVE app — HTTPS, security headers, login-protected routes, no exposed secrets, and a Supabase RLS smoke test. Read-only and safe to run against production. Run after /deploy and periodically.
argument-hint: "optional production URL"
user-invocable: true
---

# Security Check

## Goal
Verify the deployed app's security posture without touching or harming it. Run a set of read-only, non-destructive checks against the live site — is it HTTPS-only, are the security headers actually live, do protected pages really require login, is anything secret leaking to the browser, and (the big one for Supabase) can an anonymous visitor read data that should be private. Report in plain language with a clear severity and the exact fix. Safe to run against production, and worth repeating periodically — a live app's security isn't one-and-done.

## Does this project match what this skill assumes?

Read `mode` and `stack` from `.ai-eng-kit` before anything else. `new` means the kit scaffolded this
project and everything below applies as written. `existing` means the kit was added to a project that
already ran, and parts of this skill may describe a stack it does not have.

**Where they differ, say so and hand off — never improvise the equivalent.** A confident instruction
for the wrong stack costs more than an honest "I don't know how this project does that", because the
user cannot tell the two apart from the outside. Use `commands` for anything you run and `probe` for
anything you verify; a `null` there means unknown, and the answer is to ask, not to guess.

- **HTTPS, security headers, protected routes, secrets in client bundles, credentials in URLs** → these are
  properties of any web app and apply unchanged, whatever built it.
- **The Supabase RLS smoke test** → only when `stack.backend` is `supabase`. Otherwise find how this project
  enforces per-user access and check *that*, read-only. Report "not checked, and here is why" rather than
  silently dropping the most important test in the list.
- **`platform` is not `web`** → most of this does not apply. An MCP server's surface is its tool scope,
  what its tool results can inject, and what secrets they leak; a mobile app's is storage and transport.
  Say plainly which checks you skipped and why, and do not report a green result for a surface you never
  looked at.

## Safety rules (non-negotiable)
- **Read-only / non-destructive only.** Never write, delete, fuzz, brute-force, or load-test. No active attacks — those belong in `/qa` against the **test** environment, never against production. (Aggressive scanning of cloud-hosted apps can also violate your host's terms of service.)
- **Never read `.env*` files.** Everything you need is public: the production URL, and the anon / `NEXT_PUBLIC_` Supabase key (which ships to every browser anyway). Get them from the user or the live site — never from secret files.
- **Smoke test, not a full audit.** This catches the common, high-impact misconfigurations — not everything. For a real adversarial test, use `/qa` against staging, or a professional pentest.

## Before Starting
1. Confirm the **production URL** (from the deployment record in `features/INDEX.md`, or ask).
2. Note whether the app has a **Supabase backend** (skip the RLS check if not) and which tables should be user-private (from `design.md` / `supabase/migrations/`).
3. Identify which **routes/pages are meant to require login** (from the feature specs).

## Checks

### 1. HTTPS & transport
- The site loads over HTTPS, and plain HTTP redirects to HTTPS.
- `Strict-Transport-Security` (HSTS) header is present.

### 2. Security headers (verify on the LIVE url)
Fetch the live response headers and confirm the ones `docs/production/security-headers.md` configures are actually present: `Content-Security-Policy`, `X-Frame-Options` (or CSP `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Flag any missing — hosts sometimes strip or override headers, so check the live URL, not just `next.config`.

### 3. Login-protected routes
For each route that should require auth, request it **without a session** → it must redirect to login or return 401/403, never render the protected data. Flag any protected page that loads for an anonymous visitor.

### 4. No secrets in the browser
- Inspect the live client bundle and network responses for anything that looks like a **server** secret — especially the Supabase **`service_role`** key, a Stripe secret key, or any private/`SECRET` value. The anon / `NEXT_PUBLIC_` key being visible is **expected and fine**; a service-role or other server secret being visible is **CRITICAL**.
- Check API responses don't leak sensitive fields (password hashes, other users' emails, internal data you didn't mean to expose).

### 5. Supabase RLS smoke test (the big one)
Get the **public anon key** from the live client bundle (it's a `NEXT_PUBLIC_` value baked into the deployed JavaScript and sent to every browser) or ask the user to paste it — never read it from `.env`. Using only that anon key, act as an anonymous visitor and try to **SELECT** from a table that should be user-private:
- Expected: 0 rows / permission denied — Row Level Security is doing its job.
- ⚠️ **CRITICAL** if it returns other users' rows: RLS is missing or misconfigured — the #1 real-world Supabase vulnerability (private data readable by anyone with the public key).
- **SELECT only — never insert/update/delete.** Report the table and the exact fix (enable RLS + add an owner-only policy), routed through `/build`.

### 6. Rate limiting / abuse (light, non-destructive)
Confirm sensitive endpoints (login, signup, password reset) appear to have some protection — but do **not** actually hammer them. A few normal requests at most; note if there's clearly no limit, don't try to trigger one.

Verify **presence**, not resistance — you check that the guards exist, `/qa` is where they get attacked (on test, never here):
- Is there a **CAPTCHA** on the live login/signup form? Read the markup for an hCaptcha or Turnstile widget.
- Does the app's own code throttle its auth routes? Check `src/` for the rate-limit call on the login/signup path — the live site can't show you this, the repo can.
- Does a failed login **reveal whether the account exists**? One deliberate attempt with an address that certainly doesn't exist, compared against the wording for a wrong password. Two requests, not a campaign.

If the only protection is Supabase's built-in per-IP limit, say so as a finding, not a pass: it does not stop a distributed attack or credential stuffing. Route the fix through `/refine` + `/build`, never fix it here.

### 7. No credentials in URLs (read-only)
Inspect the login/signup form markup on the live site (don't submit real credentials). A `<form method="get">` — or a form with no Server Action and no JS submit handler — would put `email`/`password` straight into the URL on submit (`/login?password=…`), leaking them to history, logs, and `Referer`. Flag a credential-carrying GET form as **CRITICAL**; the fix is a Server Action or a `preventDefault()` handler, routed through `/build`.

## Write the Report
Persist the result to `docs/production/security-report.md` so there's a dated record, not just chat output. The file has two parts that behave differently:
- **Latest** — the full result of *this* run; **overwrite** it every time.
- **History** — one compact row per run; **append** a row, keeping all prior rows.

Steps:
1. Read `docs/production/security-report.md` if it exists, to preserve the History table. If it doesn't exist, create the file.
2. Replace the `## Latest` section with this run's full result (URL, date, passed checks, findings with severity + fix).
3. Append one row to the `## History` table: date · status · critical/medium/low counts. Never rewrite or drop existing history rows.
4. Use today's real date (run `date +%F` if unsure).

Structure to follow:
```markdown
# Security Check Report

_Last run: YYYY-MM-DD · <status emoji + one-line summary>_

## Latest — YYYY-MM-DD · <production URL>

✅ Passed: <short list of what passed>

### Findings
- 🔴 CRITICAL — <what> → <fix + which skill closes it>
- 🟡 MEDIUM — <what> → <fix>
<or: "No findings — no common misconfigurations detected.">

## History
| Date | Status | Critical | Medium | Low |
|------|--------|----------|--------|-----|
| YYYY-MM-DD | ⚠️ | 1 | 1 | 0 |
```
The History table is append-only: each run adds its row beneath the previous ones (newest at the bottom), so the file stays a slim, glanceable trail while `## Latest` always holds the current detail.

## Output
Present the same result in chat (and tell the user it was saved to `docs/production/security-report.md`) — grouped by severity, each finding with its fix and the skill that closes it:

```
🔒 Security Check — https://your-app…

✅ Passed
   HTTPS + HSTS · security headers present · /dashboard requires login · no secrets in bundle

⚠️ Findings (2)
   🔴 CRITICAL — RLS: an anonymous visitor can read the `profiles` table (12 rows)
      → Enable Row Level Security on `profiles` + add an owner-only policy. Fix via /build, then redeploy.
   🟡 MEDIUM — Missing header: Content-Security-Policy is not present on the live site
      → Add it per docs/production/security-headers.md, then redeploy.

Summary: 4 passed · 1 critical · 1 medium
```

## Important
- **Always save the dated report** to `docs/production/security-report.md` (Latest overwritten, History appended) — chat output alone isn't a record.
- **Read-only and non-destructive** — report and route fixes through the proper skills (RLS / headers / auth fixes go through `/build` → `/deploy` again).
- Plain language, no jargon — the audience is a non-coder. Explain in one sentence why each finding matters.
- A clean result means "no common misconfigurations found", **not** "provably secure" — say so.
- Never read secret files; never run active attacks against production.
- Cheap ongoing complement: remind the user that `npm audit` flags known vulnerabilities in their dependencies — worth running now and then.

## Handoff
Always mention the saved report (`docs/production/security-report.md`).
- All clear:
  > "No common security misconfigurations found on the live site — saved to `docs/production/security-report.md`. (This is a smoke test, not a full audit.) Re-run after any change that touches auth, data access, or headers."
- Findings:
  > List fixes most-severe first; note they're in the report. For code/RLS/header fixes: "Run `/build` to fix, then `/deploy` again, then `/security-check` to confirm."
