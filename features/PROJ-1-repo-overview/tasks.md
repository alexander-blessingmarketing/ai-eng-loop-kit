# PROJ-1 Tasks

> Generiert von `/tasks` aus `spec.md` + `design.md`. Geordneter, nachvollziehbarer Bauplan.
> `[P]` = parallelisierbar: die Dateien der Aufgabe sind disjunkt zu jeder anderen `[P]`-Aufgabe derselben Ebene.
> Ebenen laufen **sequenziell** (jede ist eine Barriere). Aufgaben **innerhalb** einer Ebene laufen parallel, wo `[P]` markiert.

## Level 1 — Fundament

<!-- Design-Tokens, Typen und GitHub-Client — alles, worauf spätere Ebenen aufbauen. Drei disjunkte Dateien → alle [P]. -->

- [ ] T1 [P]  Design-System-Tokens einbinden (Farben, Radius als Tailwind-Theme; Orbitron + JetBrains Mono als Fonts)  · files: src/app/globals.css, src/app/layout.tsx  · → (Design-System-Grundlage für alle UI-Aufgaben)
- [ ] T2 [P]  GitHub-Datentypen (Repo-Shape aus design.md: id, name, fullName, visibility, language, openPRCount, updatedAt, isArchived, isFork)  · files: src/lib/github/types.ts  · → AC-1, AC-2
- [ ] T3 [P]  GitHub-API-Client: `fetch` gegen `/user/repos` + `/repos/{o}/{r}/pulls`, automatische Pagination, Token ausschließlich serverseitig gelesen, strukturierte Fehler ("token" / "unavailable")  · files: src/lib/github/client.ts  · → AC-1, AC-8, EC-1, EC-5

## Level 2 — API

<!-- Route Handler, der Client + Typen aus Level 1 nutzt. -->

- [ ] T4  Route Handler `GET /api/repos`: ruft GitHub-Client auf, filtert isArchived/isFork heraus, holt offene-PR-Zahl pro Repo, sortiert absteigend nach updatedAt, mappt Client-Fehler auf strukturierte JSON-Fehlerantworten  · files: src/app/api/repos/route.ts  · → AC-1, AC-5, AC-6, AC-8, EC-1, EC-2, EC-4, EC-5

## Level 3 — Geteilte Shell-Komponenten

<!-- Aus docs/app-shell.md → Shell-Komponenten. Drei disjunkte Dateien → alle [P]. -->

- [ ] T5 [P]  PageHeader-Komponente (Titel, optionaler Action-Button)  · files: src/components/page-header.tsx  · → (Seiten-Muster aus docs/app-shell.md)
- [ ] T6 [P]  ErrorState-Komponente mit Retry-Button  · files: src/components/error-state.tsx  · → AC-5, AC-6
- [ ] T7 [P]  EmptyState-Komponente  · files: src/components/empty-state.tsx  · → AC-3

## Level 4 — Feature-UI-Komponenten

<!-- Disjunkte Dateien → beide [P]. -->

- [ ] T8 [P]  RepoCard-Komponente (Name, Sichtbarkeits-Badge, Sprach-Label mit Platzhalter, PR-Zähler, relative Zeit via `Intl.RelativeTimeFormat`, klickbar)  · files: src/components/repo-card.tsx  · → AC-2, AC-7, EC-2
- [ ] T9 [P]  RepoList-Komponente inkl. Skeleton-Ladezustand  · files: src/components/repo-list.tsx  · → AC-4

## Level 5 — Seiten-Komposition

<!-- Verdrahtet alles aus den vorigen Ebenen. -->

- [ ] T10  Hauptseite "/": lädt `/api/repos` client-seitig mit `AbortController` (bricht überlappende Requests ab), rendert genau einen Zustand (Error / Loading / Empty / RepoList), Klick auf RepoCard navigiert zur Detailroute  · files: src/app/page.tsx  · → AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, EC-3, EC-4

## Parallelisierung

- **Ebenen sind Barrieren.** Eine Ebene startet erst, wenn die vorige vollständig integriert und gegen ihre AC-IDs verifiziert ist.
- **`[P]` verlangt disjunkte Dateien.** Zwei `[P]`-Aufgaben derselben Ebene teilen sich nie einen Pfad unter `files:`.
- **Grobgranular, nicht mikro.** 10 Aufgaben, jede ein sinnvoller Prüfpunkt.
