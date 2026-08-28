# PROJ-2 Tasks

> Generiert von `/tasks` aus `spec.md` + `design.md`.

## Level 1 — Fundament

<!-- Disjunkte Dateien → [P]. -->

- [x] T1 [P]  Typen erweitern: `Commit`, `PullRequestSummary`, `RepoDetailData`, `RepoDetailResult`; `RepoListErrorType` um `"not_found"` erweitern  · files: src/lib/github/types.ts  · → AC-1, AC-2, AC-3, AC-5
- [x] T2 [P]  Client erweitern: `fetchRepoDetail(owner, repo)` (Existenz-Check → 404 als "not_found", parallel Commits/offene PRs/geschlossene PRs laden, 409 auf `/commits` als leeres Repo behandeln), `githubFetch` um 404-Fall ergänzen  · files: src/lib/github/client.ts  · → AC-1, AC-2, AC-3, AC-5, AC-9, EC-1, EC-2, EC-4

## Level 2 — API

- [x] T3  Route Handler `GET /api/repos/[owner]/[repo]`: ruft `fetchRepoDetail` auf, mappt Fehler auf HTTP 404/401/503  · files: src/app/api/repos/[owner]/[repo]/route.ts  · → AC-1, AC-2, AC-3, AC-5, AC-6, AC-9

## Level 3 — Geteilte Komponenten erweitern

- [x] T4  `ErrorState`: `onRetry`-Prop optional machen, Button nur rendern wenn vorhanden  · files: src/components/error-state.tsx  · → AC-5

## Level 4 — Feature-UI-Komponenten

<!-- Disjunkte Dateien → beide [P]. -->

- [x] T5 [P]  CommitSection + CommitItem (Titel-Zeile, Autor oder Platzhalter, relative Zeit, EmptyState bei keinen Commits)  · files: src/components/commit-section.tsx  · → AC-1, AC-9, EC-1, EC-2
- [x] T6 [P]  PullRequestSection (offen + zuletzt geschlossen getrennt, EmptyState bei keinen offenen PRs)  · files: src/components/pull-request-section.tsx  · → AC-2, AC-3, AC-8

## Level 5 — Seiten-Komposition

- [x] T7  Detailseite `/repos/[owner]/[repo]`: lädt `/api/repos/{owner}/{repo}` mit `AbortController` (EC-3), PageHeader mit Zurück-Link (AC-4), rendert genau einen Zustand (Error / NotFound / Loading / Content)  · files: src/app/repos/[owner]/[repo]/page.tsx  · → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, EC-3, EC-4

## Parallelisierung

- **Ebenen sind Barrieren.**
- **`[P]` verlangt disjunkte Dateien.**
- **Grobgranular, nicht mikro.** 7 Aufgaben.
