---
name: observability
description: Use to configure PostHog client + server tracking, instrument events via trackMutation/withObservability, identify users, set up structured logs (Pino + OTLP → PostHog), capture exceptions, and verify events arrive in PostHog. Triggers when the user wants to "track an event", "add analytics", "configure PostHog", set up server-side tracking, instrument a route handler with logging, or troubleshoot why events/logs are missing.
---

# /observability — PostHog Client + Server Tracking + Structured Logs

## When to use
- Neue Events instrumentieren (Page-Views sind automatisch, alles andere nicht).
- Server-Actions / Route Handlers mit `withObservability()` wrappen → automatischer Request-Context, Canonical-Log-Line, Error-Capture.
- Mutations server-seitig tracken → `trackMutation()` aus der Registry.
- Identify-Logic anpassen (User-Properties, Group-Analytics).
- Strukturierte Logs schreiben (`logger.info({route, ...}, "...")`).
- Sourcemap-Upload prüfen oder reparieren.
- Verifizieren, dass Events / Logs in PostHog EU-Cloud ankommen.

## Architektur (vorgegeben durch Starter-Kit)

| Layer | Datei | Zweck |
|-------|-------|-------|
| Client-Init | `src/instrumentation-client.ts` | `posthog.init()` mit `capture_exceptions`, `register({environment})`, Cookie-Consent-Gate |
| Page-Views | `src/components/posthog-pageview.tsx` | Automatisches `$pageview` bei Route-Wechsel |
| Identify | `src/components/posthog-identify.tsx` | User identifizieren nach Login |
| Cookie-Consent | `src/components/cookie-consent.tsx` | `opt_in_capturing` / `opt_out_capturing` |
| Server-Init | `src/instrumentation.ts` + `src/instrumentation-node.ts` | OTel-LoggerProvider + Custom-OTLP-Exporter zu PostHog Logs Ingest |
| Server-Client | `src/lib/posthog-server.ts` | `posthog-node` Singleton via `globalThis` (HMR-stabil), `flushAt: 5` + `flushInterval: 2000`, `beforeExit`-Shutdown |
| Mutation-Tracking | `src/lib/tracked-mutations.ts` | Zod-validierte Registry, `trackMutation('event', ctx, props)` |
| Wrapper | `src/lib/with-observability.ts` | RouteHandler-Wrapper: ALS-Scope, request_id, Canonical-Log-Line, captureException |
| Logger | `src/lib/logger.ts` | Pino mit `redact` für PII, Mixin liest RequestContext, parallel zu stdout + OTel |
| Request-Context | `src/lib/request-context.ts` | AsyncLocalStorage mit `request_id`, `user_id`, `route`, `method` |
| OTel-Bridge | `src/lib/otel-logs.ts` | `emitPinoEntry()` mappt Pino-JSON → OTel-LogRecord |
| Proxy | `next.config.ts` rewrites `/ingest/*` → `eu.i.posthog.com` | Adblocker-Resistenz |
| Sourcemaps | optional `@posthog/nextjs-config` | Auto-Upload bei Build |

## Standard-Workflow

### 1. Client-Side Event tracken
```ts
'use client'
import { usePostHog } from 'posthog-js/react'

const posthog = usePostHog()
posthog?.capture('feature_used', { feature: 'pdf_export', count: 3 })
```

### 2. Server-Side: Mutation tracken
**Bevorzugt** über die Mutation-Registry — Zod-validiert, automatischer Source-Tag.

Signatur: `trackMutation(name, properties, context)` — **Properties vor Context**, und die Funktion ist
Fire-and-forget (`void`, kein Promise). Kein `await`.

```ts
import { trackMutation } from '@/lib/tracked-mutations'

trackMutation('user_invited', { role: 'admin' }, {
  distinctId: invitee.id,
  source: 'api-v1',
})
```

`source` ist genau eines von `'web' | 'api-v1' | 'system'` (Typ `TrackSource`) — siehe die
Distinct-ID-Strategie: `docs/architektur/observability.md`, Abschnitt 1.

> ⚠️ **Properties werden bei Schema-Verstoß still verworfen** (`if (!parsed.success) return`).
> Vertauschte Argumente oder ein Tippfehler im Property-Namen führen also nicht zu einem Fehler,
> sondern dazu, dass gar kein Event ankommt. Nach dem Anlegen eines neuen Events immer in PostHog
> gegenprüfen, dass es wirklich auftaucht.

Neue Events zur Registry in `src/lib/tracked-mutations.ts` hinzufügen:
```ts
export const TRACKED_MUTATIONS = {
  user_invited: z.object({ role: z.enum(['admin', 'member']) }),
  // hier neue Events ergänzen
} as const
```

### 3. Route-Handler / Server-Action wrappen
```ts
import { withObservability } from '@/lib/with-observability'

export const POST = withObservability(async (req) => {
  // getLogger() bekommt automatisch request_id + route + method
  return Response.json({ ok: true })
})

// Optional: source überschreiben (Default ist 'web')
export const PUT = withObservability(handler, { source: 'api-v1' })
```

Die Route wird **nicht** übergeben — der Wrapper liest sie selbst aus `request.url`. Einzige Option ist
`source?: TrackSource`.

Was der Wrapper liefert:
- `request_id` (UUID v4 oder vorhandener `x-request-id`-Header) im ALS-Scope
- Canonical-Log-Line am Request-Ende: `{ route, method, status, duration_ms, request_id }`
- Error-Capture: `posthog.captureException` + Error-Log + 500-Response bei Throw
- `x-request-id`-Response-Header für Client-Korrelation

### 4. Strukturiert loggen
`logger.ts` exportiert **`getLogger()`**, keine `logger`-Konstante — der Pino-Singleton wird beim ersten
Aufruf gebaut und in `globalThis` gehalten (HMR-stabil).

```ts
import { getLogger } from '@/lib/logger'

const log = getLogger()
log.info({ user_id, action: 'export' }, 'PDF export started')
log.error({ err }, 'failed to load profile')
```

PII (`authorization`, `cookie`, `password`, `token`, `api_key`) wird automatisch redacted. RequestContext (request_id, route, method, user_id) wird automatisch via Mixin gemerged — kein manuelles Übergeben.

`setUserId(userId)` aus `request-context.ts` aufrufen, sobald die User-Session im Handler bekannt ist — alle nachfolgenden Logs des Requests bekommen `user_id` automatisch.

### 5. User identifizieren (Client)
Bereits eingebaut — `<PostHogIdentify profile={profile} />` im authenticated Layout rendern.

### 6. Verifikation
```bash
# Lokal
npm run dev
# Browser → DevTools → Network → /ingest/* sollte 200 zurückgeben
# In Production: PostHog UI → Activity → Events / Logs → innerhalb 5–10s sichtbar
```

Logs landen in PostHog unter **Logs** (eigener Tab), nicht in **Events**. Filter: `service.name`, `level`, `request_id`.

### 7. Sourcemap-Upload prüfen
> **Standardmäßig nicht aktiv.** `@posthog/nextjs-config` ist nicht installiert, und in
> `next.config.ts` steht der Aufruf nur als Kommentar. Ohne Aktivierung ist hier nichts zu prüfen —
> Stack-Traces in PostHog bleiben dann unlesbar (minifiziert).
>
> Aktivieren: `npm i @posthog/nextjs-config`, dann `withPostHogConfig(nextConfig, …)` zurückgeben
> statt `nextConfig`. Anleitung: `docs/production/posthog-sourcemaps.md`.

Erst **nach** der Aktivierung greift diese Prüfung:
```bash
npm run build
# Output sollte enthalten: "Uploading sourcemaps to PostHog…"
# Wenn nicht: POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID prüfen (Build-Time-Envs!)
```

## Konventionen für Event-Namen
- snake_case, Verb-orientiert: `feature_used`, `invite_sent`, `export_started`
- Properties: snake_case, Werte schema-klar (booleans, strings, numbers)
- `$set`/`$set_once` nur in `identify()`, nicht in normalen Events

## Konventionen für Logs
- `logger.info` für Standard-Flow, `logger.warn` für recoverable Probleme, `logger.error` für unerwartete Throws (zusätzlich zu PostHog `captureException`)
- Erste Argument-Object: strukturierte Felder. Zweites: human-readable Message.
- Niemals Tokens / Cookies / Passwörter manuell loggen — Redact-Pfade greifen automatisch, aber nur auf bekannten Keys.
- `service.name` kommt automatisch aus `NEXT_PUBLIC_APP_NAME` — beim Bootstrap setzen.

## Edge Cases
- **Adblocker blockiert /ingest:** Proxy in `next.config.ts` ist Pflicht. Niemals direkt zu `eu.i.posthog.com` capture-en aus Browser.
- **Events fehlen in Production:** `NEXT_PUBLIC_POSTHOG_KEY` nicht in Vercel-Env? `vercel env pull` + neu deployen.
- **Logs fehlen:** Logs werden **nur in Production** an PostHog geschickt (Cold-Start-Schutz). Lokal nur stdout. Bei fehlenden Prod-Logs: `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_APP_NAME` als Server-Env in Vercel prüfen.
- **`request_id` ist `undefined` im Log:** Handler ist nicht via `withObservability` gewrappt. Wrapper ergänzen.
- **Keine Sourcemaps:** `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` müssen Build-Time-Envs in Vercel sein, nicht Runtime.
- **EU-Cloud:** Niemals `app.posthog.com` oder `us.i.posthog.com` einsetzen — Compliance.
- **Cron-Jobs / Migrations-Skripte:** Müssen explizit `await shutdownServerPostHog()` aufrufen — `beforeExit` greift dort nicht verlässlich (`docs/architektur/observability.md`, Abschnitt 2).

## Referenzen
- [`docs/architektur/observability.md`](../../../docs/architektur/observability.md) — warum die Instrumentierung so gebaut ist: Distinct-IDs (1), Singleton + Flush (2), Pino/OTLP (3), AsyncLocalStorage (4)
- [`docs/architektur/rate-limiting.md`](../../../docs/architektur/rate-limiting.md) — nutzt denselben Logging-Stack

## Output
Liste der instrumentierten Events + Datei-Pfade. Verifikations-Resultat (Browser-Network-Status, PostHog-Live-Event / -Log sichtbar).
