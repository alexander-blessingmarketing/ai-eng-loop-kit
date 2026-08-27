# Observability — wie die mitgelieferte Instrumentierung funktioniert

> **Referenzdokumentation, kein ADR.** Dieses Dokument erklärt Code, den die Basis mitbringt — nicht eine Entscheidung, die *dein* Projekt getroffen hat. Eigene Entscheidungen gehören nach `docs/decisions/` (ab `0001`) bzw. in das `design.md` des jeweiligen Features.
>
> Ursprung: portiert aus einem produktiven Vorgängerprojekt. Die Begründungen sind erhalten, weil sie erklären, warum der Code so aussieht — die Entscheidungen selbst fielen dort, nicht hier.

Bedienung und Rezepte stehen in der Skill `/observability`. Hier steht, **warum** es so gebaut ist.

---

## Brauchst du das überhaupt?

**Analytics ist projektspezifisch.** Die Basis bringt PostHog mit, weil es für die meisten Produkte nützlich ist — aber ein internes Werkzeug, ein Prototyp oder eine Seite ohne Nutzerkonten braucht davon nichts.

**Ohne `NEXT_PUBLIC_POSTHOG_KEY` passiert nichts.** Das ist der Schalter, und er wirkt an allen Stellen:

| | ohne Key |
|---|---|
| `posthog.init()` | läuft gar nicht erst |
| `getServerPostHog()` | gibt `null` zurück, alle Aufrufer prüfen das |
| OTLP-Logs | Provider wird nicht gebaut, Pino schreibt nur nach stdout |
| Cookie-Banner | wird nicht angezeigt |
| `/ingest`-Rewrites | werden nicht registriert |

Die letzten beiden Punkte sind wichtiger, als sie klingen. Ein **Einwilligungs-Banner ohne Anlass** behauptet eine Verarbeitung, die es nicht gibt, und holt eine Einwilligung für einen Dienst ein, der nicht läuft — rechtlich das Gegenteil von sauber. Und offene Reverse-Proxy-Routen auf eine fremde Domain, die niemand nutzt, sind unnötige Angriffsfläche.

### Ganz entfernen

Wer sicher weiß, dass kein Projekt-Feature Analytics braucht, kann den Ballast löschen:

```
src/instrumentation-client.ts          PostHog-Client-Init
src/instrumentation.ts                 Hook (lädt -node.ts)
src/instrumentation-node.ts            OTLP-Exporter
src/lib/posthog-server.ts              Server-Singleton
src/lib/tracked-mutations.ts           Event-Registry
src/lib/otel-logs.ts                   Pino → OTel-Bridge
src/components/posthog-*.tsx           Provider, Identify, Pageview
src/components/cookie-consent.tsx      Consent-Banner
src/hooks/use-posthog-identity.ts
.claude/skills/observability/          Skill
.claude/skills/posthog/                Skill
docs/production/posthog-*.md
```

Dazu: die Einbindungen aus `src/app/layout.tsx`, den `rewrites()`-Block aus `next.config.ts`, `posthog-js` / `posthog-node` / `@opentelemetry/*` aus `package.json`.

**Was dabei mitgeht:** `src/lib/logger.ts` und `src/lib/with-observability.ts` verlieren ihr Ziel. Pino schreibt dann nur noch nach stdout — das ist kein Verlust, sondern der Normalzustand ohne zentrale Log-Sammlung. `request-context.ts` und die Canonical Log Line bleiben nützlich.

**Der einfachere Weg** ist meistens, den Key wegzulassen. Der Code kostet nichts, solange er nicht läuft, und die Entscheidung bleibt umkehrbar.

---

## Überblick

| Schicht | Datei | Aufgabe |
|---|---|---|
| Client-Init | `src/instrumentation-client.ts` | `posthog.init()`, Consent-Gate, Exception-Capture |
| Page-Views | `src/components/posthog-pageview.tsx` | `$pageview` bei Route-Wechsel |
| Identify | `src/components/posthog-identify.tsx` | User nach Login identifizieren |
| Consent | `src/components/cookie-consent.tsx` | `opt_in` / `opt_out` |
| Server-Init | `src/instrumentation.ts` + `-node.ts` | OTel-LoggerProvider, Custom-OTLP-Exporter |
| Server-Client | `src/lib/posthog-server.ts` | `posthog-node`-Singleton |
| Mutations | `src/lib/tracked-mutations.ts` | Zod-validierte Event-Registry |
| Wrapper | `src/lib/with-observability.ts` | Request-Scope, Canonical Log Line, Error-Capture |
| Logger | `src/lib/logger.ts` | Pino mit PII-Redaction |
| Request-Context | `src/lib/request-context.ts` | AsyncLocalStorage |
| OTel-Bridge | `src/lib/otel-logs.ts` | Pino-JSON → OTel-LogRecord |

---

## 1. Distinct-IDs: drei getrennte Schemas

Server-Events brauchen eine Distinct-ID — den Identifier, unter dem PostHog ein Event einer Person oder Entität zuordnet. Diese Wahl bestimmt, ob Funnels funktionieren und ob Browser- und Server-Events derselben Person zusammenfinden.

Drei Quellen erzeugen Server-Events, und sie werden bewusst getrennt gehalten:

| Quelle | Distinct-ID | Warum |
|---|---|---|
| Cookie-Auth | `userId` (Supabase-UUID) | Identisch zur Browser-Identity → Browser- und Server-Event derselben Aktion gehören zusammen |
| API-Key | `api-key:<id>` | Eigenes Person-Profile, getrennt von echten Menschen |
| System (Cron, Migration) | `system:<kontext>` | Kein User-Bezug, klar erkennbar |

Zusätzlich trägt **jedes** Server-Event die Property `source: 'web' | 'api-v1' | 'system'`. Damit lässt sich in Insights Mensch von Automat trennen, ohne die Distinct-ID interpretieren zu müssen.

**Der Preis:** Die Person-Liste in PostHog enthält neben Menschen auch synthetische Profile. Akzeptiert, weil die Alternative — alles unter einer Sammel-ID — Funnels unbrauchbar macht.

## 2. Warum ein `globalThis`-Singleton für `posthog-node`

`posthog-node` puffert Events und schickt sie in Batches. Zwei Fallstricke:

**Nicht pro Request instanziieren.** Das leakt Speicher und verhindert Connection-Reuse. Der Client liegt deshalb in `globalThis.__posthogServerSingleton` — das überlebt auch Hot Module Replacement in der Entwicklung, was ein Modul-Level-`const` nicht tut.

**Flush-Konfiguration:** `flushAt: 5`, `flushInterval: 2000`.

Der Trade-off: Ein niedriges `flushAt` bedeutet mehr HTTP-Requests, aber wenig Datenverlust-Risiko. Ein hohes bedeutet das Gegenteil. 5 Events bzw. 2 Sekunden ist der Kompromiss für Vercel Fluid Compute, wo Function-Instanzen zwischen Requests weiterleben.

**Graceful Shutdown** über `process.on('beforeExit')`. Wichtig: **In Cron-Jobs und Migrations-Skripten greift das nicht verlässlich** — dort muss explizit `await shutdownServerPostHog()` aufgerufen werden, sonst gehen die letzten Events verloren.

In normalen Route Handlers wird **nicht** geflusht — der Hintergrund-Flush plus `beforeExit` genügt, und ein `await` im Hot Path würde jeden Request verlangsamen.

> Der Client ist `null` außerhalb von Production oder ohne `NEXT_PUBLIC_POSTHOG_KEY`. Alle Aufrufer müssen damit umgehen.

## 3. Warum ein eigener OTLP-Exporter

Logs gehen an PostHogs OTLP-Ingest (`eu.i.posthog.com/i/v1/logs`) — im selben Werkzeug wie Events und Sourcemaps.

Statt `@opentelemetry/exporter-logs-otlp-http` liegt in `src/instrumentation-node.ts` ein eigener `fetch`-basierter Exporter. Grund: **Der Standard-Exporter verschluckt Fehler.** Bei einem Endpoint-Problem gingen Logs still verloren — und ausgerechnet Logging-Infrastruktur, die stumm ausfällt, ist wertlos. Die eigene Variante schreibt HTTP-Fehler auf `console.error` und macht Probleme sichtbar.

**Der Weg eines Log-Eintrags:**

```
logger.info({...}, "msg")
  → Pino schreibt JSON
  → otelStream: parallel nach stdout UND emitPinoEntry()
  → otel-logs.ts mappt Pino-Level → OTel-SeverityNumber
  → LoggerProvider → PostHogLogExporter → HTTP POST
```

**PII-Redaction** ist in Pino konfiguriert: `authorization`, `cookie`, `password`, `token`, `api_key` — auch als verschachtelte Pfade. Greift automatisch, aber **nur auf diese bekannten Schlüssel**. Wer ein Feld anders nennt, loggt es im Klartext.

**Nur in Production.** Lokal geht alles nach stdout; der OTLP-Provider wird gar nicht erst gebaut (Cold-Start-Schutz).

> **Bekannte Grenze:** Es läuft ein `SimpleLogRecordProcessor` — der exportiert **synchron pro Logzeile**, also ein HTTP-Request je Zeile. Bei der aktuellen Menge unauffällig; unter Last ist der Wechsel auf `BatchLogRecordProcessor` die erste Stellschraube.

## 4. Warum AsyncLocalStorage statt Middleware

Damit jede Logzeile eines Requests dieselbe `request_id` trägt, braucht es einen Request-Scope. Next.js Middleware — inzwischen `proxy.ts` — kann das nicht leisten: Sie läuft in einem anderen Kontext als der Route Handler und kann keinen Scope über dessen Ausführung legen.

Deshalb ein expliziter Wrapper, `withObservability(handler)`:

1. Erzeugt eine `request_id` (UUID v4) — oder übernimmt einen eingehenden `x-request-id`-Header, damit sich Ketten über Systemgrenzen verfolgen lassen.
2. Liest `route` und `method` aus dem Request.
3. Öffnet den AsyncLocalStorage-Scope und ruft den Handler darin auf.
4. Schreibt am Ende eine **Canonical Log Line**: `{ route, method, status, duration_ms, request_id }` — eine Zeile pro Request, die für die meisten Fragen reicht.
5. Setzt `x-request-id` als Response-Header, damit der Client korrelieren kann.
6. Bei einem Throw: `captureException` an PostHog, Error-Log, 500-Response.

Pino liest den Kontext über einen **Mixin** — pro Logeintrag wird `als.getStore()` aufgerufen und die Felder werden gemerged. Niemand muss `request_id` manuell durchreichen.

`setUserId(userId)` aus `request-context.ts` ergänzt die User-ID, sobald die Session im Handler bekannt ist. Alle folgenden Logs desselben Requests tragen sie dann automatisch.

**Der Preis:** Der Wrapper ist explizit — wer ihn vergisst, bekommt Logs ohne `request_id`, und zwar ohne Warnung. Das ist bewusst so: Die Alternative wäre ein globaler Patch gewesen, der schwerer zu durchschauen ist.

---

## Plattform-Kopplung

Fünf Stellen lesen `NEXT_PUBLIC_VERCEL_ENV` bzw. `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Auf einem anderen Host fallen alle Environment-Labels still auf `"development"` und die Release-Version auf `"unknown"` — kein Absturz, aber falsche Zuordnung in PostHog. Bei einem Hosting-Wechsel zuerst hier nachsehen.

## Verwandte Dokumente

- `/observability` — Skill mit den Rezepten (Events tracken, Handler wrappen, verifizieren)
- [rate-limiting.md](rate-limiting.md) — nutzt denselben Logging-Stack
- `docs/production/error-tracking.md` — Sentry als Alternative, plus DSGVO-Hinweise zum Scrubbing
- `docs/production/posthog-adblocker.md`, `posthog-sourcemaps.md` — Betriebsdetails
