# Error Tracking Setup (Sentry)

Track production errors automatically so you know about issues before your users report them.

## Setup (5 minutes)

### 1. Create Sentry Account
- Go to [sentry.io](https://sentry.io) (free tier available for small apps)
- Create a new project and select "Next.js"

### 2. Install Next.js Integration
```bash
npx @sentry/wizard@latest -i nextjs
```
This automatically:
- Installs `@sentry/nextjs`
- Creates the config files (recent App Router versions use `instrumentation.ts` + `instrumentation-client.ts`; older ones `sentry.client.config.ts` / `sentry.server.config.ts`) — let the wizard decide, don't create them by hand
- Updates `next.config.ts` with the Sentry plugin

### 3. Add Environment Variables
Add to `.env.local` (local) and your host's environment variables (production):
```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx  # For source maps upload
```

### 4. Verify Setup
Trigger a test error and check Sentry Dashboard:
```typescript
// Temporary test - remove after verification
throw new Error("Sentry test error")
```

## What You Get
- Automatic error capture (client + server)
- Stack traces with source maps
- Error grouping and deduplication
- Email alerts for new errors
- Performance monitoring (optional)

## Before You Ship: Don't Let Errors Leak Personal Data

Error tracking is the most common accidental data leak in a web app. A crash report carries whatever was in scope at the time — the email in the URL, the contents of the form the user just submitted, their IP address, their session. That data leaves your app and lands on a third party's servers. Under GDPR that makes Sentry a processor of personal data, and it needs to be set up deliberately.

**1. Turn off sending personal data by default.** In `sentry.client.config.ts` and `sentry.server.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,        // don't attach IP addresses, cookies, or user headers
  beforeSend(event) {
    // Drop anything users typed — form bodies and query strings are the usual culprits
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
      if (event.request.headers) delete event.request.headers['authorization']
    }
    return event
  },
})
```

`sendDefaultPii` defaults to sending IP addresses and request headers — set it explicitly rather than relying on the default staying put.

**2. Choose the EU region.** Sentry lets you pick where your data is stored when you create the organisation (`https://sentry.io` → EU data residency, giving you a `.de.sentry.io` ingest domain). Like the Supabase region, this is decided at creation time and is painful to change afterwards.

**3. Sign the AVV (data processing agreement).** Sentry provides one in the organisation settings under Legal & Compliance. Same for your host. This is a legal requirement under Art. 28 GDPR, not an optional formality.

**4. Set a retention period.** The default keeps error data for 90 days. Shorten it if you have no reason to keep it that long — retaining less is always the easier position to defend.

**5. Mention it in your privacy policy.** Sentry belongs in the list of processors, alongside your host and database. `docs/privacy.md` tracks these; `/dsgvo` keeps it current.

> If you'd rather avoid a third-party processor entirely, the Vercel option below keeps error data with the host you already use — one processor instead of two.

## Alternative
**Vercel Error Tracking** - Built-in, simpler, but fewer features. Available in Vercel Dashboard under "Monitoring".
