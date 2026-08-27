# PostHog Sourcemaps & Release-Warnung

## Setup

Sourcemap-Upload läuft über `@posthog/nextjs-config` in [next.config.ts](../../next.config.ts):

```ts
withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
  projectId: process.env.POSTHOG_PROJECT_ID!,
  host: "https://eu.i.posthog.com",
  sourcemaps: { enabled: true, deleteAfterUpload: true },
})
```

Aktiviert nur, wenn `POSTHOG_PERSONAL_API_KEY` und `POSTHOG_PROJECT_ID` in Vercel-Env gesetzt sind.

## `withPostHogConfig`-Optionen

| Feld | Default | Zweck |
|------|---------|-------|
| `enabled` | `true` (production) | Sourcemap-Inject + Upload toggeln |
| `releaseName` | Repo-Name (`my-project`) | Release-Identifier in PostHog |
| `releaseVersion` | aktueller Git-Commit-SHA | Version-Tag des Releases |
| `deleteAfterUpload` | `true` | Sourcemaps nach Upload löschen |

## Build-Warnung: `release ... not found`

```
WARN posthog_cli::api::releases: release my-project@<sha> not found
```

**Ursache:** Vor dem Upload macht `posthog-cli` einen Lookup, ob für die Commit-SHA bereits ein Release existiert. Beim ersten Build pro Commit ist das erwartungsgemäß leer → Warnung. Direkt im selben Run legt der Upload-Schritt den Release dann an ("create or reuse").

**Status:** Erwartetes Verhalten, kein Fehler. Sourcemaps landen trotzdem in PostHog.

**Nicht-Optionen:**
- `posthog-cli releases create` existiert **nicht** als Subcommand.
- Plugin hat **keine Option**, die Warnung zu unterdrücken oder Release pre-emptiv anzulegen.
- Reihenfolge im Build-Script umstellen bringt nichts — Plugin steuert den Ablauf intern.

**Reaktivieren wenn:**
- Warnung wird zum Error (Build-Failure) → PostHog-Issue prüfen, Plugin-Version aktualisieren.
- Sourcemaps tauchen in PostHog Error-Tracking nicht auf → Personal-API-Key + Project-ID + EU-Host verifizieren.

## Quellen

- [npm @posthog/nextjs-config README](https://github.com/PostHog/posthog-js/blob/main/packages/nextjs-config/README.md)
- [PostHog Docs: Upload source maps with CLI](https://posthog.com/docs/error-tracking/upload-source-maps/cli)
- [PostHog Docs: Releases](https://posthog.com/docs/error-tracking/releases)
