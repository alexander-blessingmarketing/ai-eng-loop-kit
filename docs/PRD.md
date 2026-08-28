# Product Requirements Document

## Vision
Ein minimalistisches, rein lokales Dashboard, das auf einen Blick zeigt, was in den eigenen GitHub-Repos passiert — Name, offene PRs, letzte Commits und Historie — ohne dass man dafür GitHub selbst durchklicken muss.

## Target Users
Ausschließlich der Entwickler selbst (Ein-Personen-Tool, kein Multi-User). Jemand mit mehreren aktiven Repos, der schnell den Überblick behalten will, ohne mehrere GitHub-Tabs offen zu haben.

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Repo-Übersicht — Liste aller Repos (live von GitHub API), sortiert nach zuletzt aktualisiert, mit Kennzahlen wie letzter Commit, Anzahl offener PRs, Sprache | Planned |
| P0 (MVP) | Repo-Detail — Klick auf ein Repo zeigt Commit-Historie und PR-Liste (offen + zuletzt geschlossen) im Detail | Planned |
| P1 | Suche/Filter in der Repo-Liste (nach Name, Sprache) | Planned |

## Success Metrics
Kein Wachstums-/Nutzerziel (Ein-Personen-Tool). Erfolg = du öffnest es regelmäßig statt github.com direkt, weil es schneller den Überblick gibt.

## Constraints
- Kein Backend/Datenbank — alle Daten live von der GitHub-API, keine eigene Persistenz
- Nur lokal (`npm run dev`), kein Deploy, kein Hosting
- Kein Login/Accounts — Zugriff auf GitHub über einen Personal Access Token (Details dazu bei `/architecture`)
- Design-System: siehe `docs/design-system.md` (Dark-only, Cyberpunk)
- Nebenprojekt, kein festes Datum

## Non-Goals
- Keine Mehrbenutzer-Unterstützung, keine Accounts
- Keine schreibenden Aktionen (kein Mergen/Kommentieren von PRs aus dem Tool heraus)
- Kein Deployment/Hosting, keine öffentliche URL
- Keine eigene Datenhistorie über das hinaus, was die GitHub-API selbst liefert
- Keine Benachrichtigungen/Alerts
