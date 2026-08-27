# Bekannte Schwächen dieser Basis

> Was hier steht, ist geprüft und bewusst offen — keine Überraschung, sondern eine Liste. Wer auf dieser Basis ein Projekt baut, sollte sie einmal durchgehen und entscheiden, was für den konkreten Fall relevant ist.
>
> Stand: 2026-08-24. Herkunft: Code-Audit beim Zusammenführen des Vorgänger-Kits mit dem AI Engineering Kit 0.4.1.

## Datenschutz

### `identify()` überträgt E-Mail und Name

`src/hooks/use-posthog-identity.ts` — beabsichtigt und normal, gehört aber ins Verarbeitungsverzeichnis. `/dsgvo` legt dafür `docs/privacy.md` an.

## Betrieb

### Plattform-Kopplung an Vercel

Fünf Stellen lesen `NEXT_PUBLIC_VERCEL_ENV` bzw. `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Auf einem anderen Host — `/deploy` unterstützt auch Hostinger — fallen alle Environment-Labels still auf `"development"` und die Release-Version auf `"unknown"`. Kein Absturz, aber falsche Zuordnung in PostHog.

### Ein HTTP-Request pro Logzeile

`src/instrumentation-node.ts` nutzt einen `SimpleLogRecordProcessor`, der synchron exportiert. Bei der erwarteten Menge unauffällig; unter Last ist der Wechsel auf `BatchLogRecordProcessor` die erste Stellschraube.

### Sourcemap-Upload ist nicht aktiv

`@posthog/nextjs-config` ist nicht installiert, der Aufruf in `next.config.ts` steht als Kommentar. Ohne Aktivierung bleiben Stack-Traces in PostHog minifiziert. Anleitung: `docs/production/posthog-sourcemaps.md`.

## Abhängigkeiten

`npm audit` meldet **6 Schwachstellen: 3 hoch, 3 moderat** (Stand 2026-08-24). Beide Gruppen gehen auf je eine Ursache zurück, und beide sind nach Prüfung **nicht erreichbar** — aber nicht ignoriert, sondern begründet zurückgestellt.

### 3× HIGH — ReDoS in `path-to-regexp`

```
@vercel/config → @vercel/routing-utils → path-to-regexp
```

*„path-to-regexp outputs backtracking regular expressions"* — ein Denial-of-Service über präparierte Routen-Pattern.

**Warum hier nicht erreichbar:** `@vercel/config` ist eine **devDependency** und wird an genau einer Stelle verwendet:

```ts
// vercel.ts
import type { VercelConfig } from "@vercel/config/v1";
```

Ein `import type` wird beim Kompilieren restlos entfernt. Das Paket landet weder im Bundle noch zur Laufzeit im Prozess — es liefert ausschließlich Typinformation.

**Warum nicht gefixt:** `npm audit fix` schlägt `@vercel/config@0.0.32` vor. Das ist ein Rückschritt von `^0.2.1` auf eine ältere Hauptversion, für ein Paket, dessen Code nie ausgeführt wird. Der Downgrade kostet mehr, als er bringt.

### 3× MODERATE — unbegrenzte Speicherzuweisung in `@opentelemetry/core`

```
@opentelemetry/sdk-logs → @opentelemetry/resources → @opentelemetry/core
```

[GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) — *unbounded memory allocation in W3C Baggage propagation*.

**Diese Gruppe verdient mehr Aufmerksamkeit als die erste:** `@opentelemetry/sdk-logs` ist eine **Runtime-Abhängigkeit** und läuft in Production tatsächlich (`src/instrumentation-node.ts`).

**Warum trotzdem nicht erreichbar:** Die Lücke sitzt in der **Baggage-Propagation** — dem Auslesen von `baggage`-Headern eingehender Requests. Dieses Projekt nutzt davon nichts: Verwendet werden `LoggerProvider`, `SimpleLogRecordProcessor`, `resourceFromAttributes` und die Severity-Typen. Es gibt keinen Propagator, keine Context-Extraktion aus Headern, kein Baggage.

**Warum nicht gefixt:** Der Vorschlag ist `@opentelemetry/sdk-logs@0.221.0`, ein Major-Sprung von `^0.216.0`. Der Custom-OTLP-Exporter implementiert `LogRecordExporter` direkt gegen die SDK-Schnittstelle — ein Major-Wechsel kann sie ändern. Lohnt sich als bewusster Schritt mit Test, nicht als blindes `audit fix`.

### Wann das neu zu bewerten ist

- Sobald ein Feature **Trace-Context oder Baggage aus eingehenden Headern** liest → die moderate Gruppe wird sofort relevant
- Sobald `@vercel/config` von `import type` auf einen echten Wert-Import wechselt
- Bei jedem Major-Update von `@opentelemetry/*` ohnehin

Dependabot ist aktiv (`.github/dependabot.yml`) und wird die Updates von sich aus vorschlagen.

## Was bereits behoben ist

Der Vollständigkeit halber, damit niemand doppelt sucht:

| Was | Wie |
|---|---|
| `rate_limits` ohne RLS | `enable row level security` + `revoke` in Migration 002 |
| `getClientIp()` nahm den fälschbaren linkesten `x-forwarded-for`-Eintrag | Jetzt `x-real-ip` zuerst, sonst der rechteste Eintrag |
| `tsconfig.json` ohne Test-Typen | `"types": ["vitest/globals", "@testing-library/jest-dom"]` |
| Vitest lud die Playwright-Specs aus `tests/` | `include`/`exclude` gesetzt |
| Observability-Skill dokumentierte sechs falsche APIs | An den Code angeglichen |
| Session-Recording zeichnete alle Eingaben auf | `maskAllInputs: true` + `maskTextSelector: "*"` |
| Kein Scrubbing vor dem Versand an PostHog | `before_send` bereinigt sensible Query-Parameter in `$current_url`, `$referrer`, `$pathname` |
| Rate-Limit zählte nur pro IP | Zusätzlicher Zähler pro Konto (`email:<adresse>`) — deckt verteilte Angriffe und Credential Stuffing ab |
| Fail-open im Rate-Limit war unsichtbar | `getLogger().error` statt `console.error` — landet mit `request_id` in PostHog |
| Health-Endpoint gab DB-Fehlermeldungen nach außen | Meldung nur noch ins Log, nach außen bloß der Statuscode |
| Keine CSP, keine Permissions-Policy | Beide gesetzt, im Browser mit 0 Verstößen verifiziert |
| Cookie-Banner zeigte sich ohne aktives Tracking | Rendert nur mit gesetztem PostHog-Key |
| Geschützte Routen warfen 500 ohne konfiguriertes Supabase | Leiten auf `/login` um; geprüft wird Brauchbarkeit, nicht bloße Anwesenheit |
| Keine CSP, keine Permissions-Policy | Beide gesetzt in `src/lib/security-headers.ts`, angewendet von `src/proxy.ts`. Im Browser verifiziert: 0 Verstöße auf `/` und `/login` |
