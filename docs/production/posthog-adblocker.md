# PostHog & Adblocker

> Status: **verifiziert** in einem produktiven Projekt (interne Audit-Notiz, Abschnitt "CI/CD & Source-Maps").

## Beobachtung

uBlock Origin **und** Brave-Shields blocken PostHog trotz Reverse-Proxy auf `/ingest` (siehe Memory `reference_posthog_proxy.md`).

**Test-Stand 2026-04-29:**
- **uBlock Origin (Standard-Listen):** blockt. Welcher Request konkret (Snippet `/ingest/static/array.js` vs. Events `/ingest/e/` / `/ingest/decide/`) ist nicht festgehalten — TODO bei nächstem Test im Network-Tab notieren.
- **Brave Browser:**
  - **Standard-Shields:** Tracking läuft durch (PostHog erhält Events) — bestätigt durch Test 2026-04-29.
  - **Aggressive Shields:** komplett geblockt — keine Activity in PostHog, **inkl. Session Replay**. Konkrete Request-Pfade ebenfalls TODO.

## Warum der Proxy nicht reicht

Der `/ingest`-Reverse-Proxy verschleiert nur die Domain (`eu.i.posthog.com` → eigene Domain). uBlocks Standard-Listen (EasyPrivacy, uBlock-Filters) matchen aber **zusätzlich** auf:

- **Pfad-Patterns** wie `/e/`, `/decide/`, `/array.js` — unabhängig von der Domain
- **Payload-Heuristiken** (PostHog-typische JSON-Felder)
- **Script-Inhalte** des `array.js`-Snippets

Domain-Cloaking allein reicht also nicht.

## Konsequenz

**Akzeptiert:** Tracking-Lücke bei Nutzern mit aktivem uBlock **oder** Brave auf "Aggressive Shields". Im Projekt-Kontext (interne Mitarbeiter) tolerierbar — keine Werbe-relevanten Metriken, primär Fehler-Tracking + Feature-Nutzung.

**Brave Standard-Shields:** unkritisch, Tracking + Session Replay funktionieren. Default-Konfiguration der meisten Brave-User.

**Praktische Implikation:** Brave-Anteil unter den Mitarbeitern ggf. relevant (Brave hat ~5–8% Anteil in DE-Tech-affinen Zielgruppen), aber nur das "Aggressive"-Subset davon ist wirklich blind — kleinere Lücke als anfangs befürchtet.

**Nicht geplant:** Aggressivere Umgehungsmaßnahmen (Pfad-Randomisierung, Payload-Obfuskation, eigene Filter-Resistenz). Würde Vertrauen kosten und nur kurzzeitig wirken — Filter-Listen ziehen nach.

## Reaktivieren wenn

- Tracking-Lücke wird relevant (z.B. Fehler-Reports fehlen systematisch von einzelnen Nutzern) → User um Whitelist für die Projekt-Domain bitten (uBlock: Filter-Ausnahme; Brave: Shields für Domain auf "Down"), **nicht** technisch umgehen.
- Bei nächstem Adblocker-Test: blockierte Request-Pfade im DevTools-Network-Tab notieren und hier ergänzen — sowohl für uBlock als auch für Brave-Shields (inkl. Stufe Standard/Aggressive).

## Quellen

- [PostHog Docs: Reverse-Proxy](https://posthog.com/docs/advanced/proxy)
- Memory: `reference_posthog_proxy.md`
