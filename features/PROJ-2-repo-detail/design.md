# PROJ-2 — Technisches Design

> Dies ist das technische Design (WIE) für das Feature. Owner: `/architecture`. Der Vertrag (WAS) lebt in `spec.md`.

## Komponenten-Struktur

```
Repo-Detail (Seite "/repos/[owner]/[repo]")
├─ PageHeader (Titel: "{owner}/{repo}", Zurück-Link zu "/" — AC-4)
├─ ErrorState        (bei AC-6: Rate-Limit/Netzwerk — mit Retry-Button)
├─ ErrorState         (bei AC-5/EC-4: Repo nicht gefunden — ohne Retry-Button, Zurück-Link genügt)
├─ LoadingState       (Skeleton — AC-7)
└─ RepoDetailContent
    ├─ CommitSection (AC-1)
    │   ├─ CommitItem × N (Titel-Zeile, Autor oder Platzhalter — EC-1, gekürzter Titel — EC-2, relative Zeit)
    │   └─ EmptyState (AC-9, keine Commits)
    └─ PullRequestSection
        ├─ "Offen" — Liste offener PRs (AC-2) + EmptyState (AC-8)
        └─ "Zuletzt geschlossen" — letzte 10 (AC-3)
```

Nur genau einer der drei Top-Level-Zustände (Error / Loading / Content) ist zu einem Zeitpunkt sichtbar — dasselbe Muster wie PROJ-1.

**`ErrorState` (aus PROJ-1, `src/components/error-state.tsx`) wird erweitert:** `onRetry` wird optional. Fehlt es, wird kein Retry-Button gerendert (sinnvoll für "Repo nicht gefunden" — ein Retry ändert daran nichts). Kein neuer Component nötig, keine Breaking Change für PROJ-1 (Prop bleibt bei Angabe unverändert nutzbar).

## Datenmodell

Kein Datenbank-Backend — wie PROJ-1 alles live von der GitHub-API, nichts persistiert.

```
Commit (nur im Server-Response-Zyklus vorhanden):
- sha: Text, eindeutig
- titleLine: Text (erste Zeile der Commit-Message, Rest serverseitig abgeschnitten — EC-2)
- authorName: Text oder null (git-Autorenname; null nur bei wirklich fehlendem Feld — EC-1)
- date: Zeitstempel (ISO 8601)

PullRequestSummary (nur im Server-Response-Zyklus vorhanden):
- id: Zahl, eindeutig
- number: Zahl (GitHub-PR-Nummer, für Anzeige "#123")
- title: Text
- authorLogin: Text oder null
- updatedAt: Zeitstempel (ISO 8601)
- state: einer von "open" | "closed"

Zugriff: nur der lokale Nutzer, keine Persistenz, keine Aufbewahrungsfrage (siehe PROJ-1-Datenmodell, identisches Muster).
```

## Verhalten & Zugriff

```
Operationen:
- GET Repo-Detail (Route Handler `GET /api/repos/[owner]/[repo]`)
  - Prüft zuerst Existenz/Sichtbarkeit über `GET /repos/{owner}/{repo}` — 404 → Fehlertyp "not_found" (AC-5, EC-4: ein ungültig formatiertes owner/repo landet über denselben 404-Pfad)
  - Lädt danach parallel: die letzten 20 Commits des Default-Branch, die letzten 10 offenen PRs, die letzten 10 geschlossenen PRs (jeweils absteigend sortiert)
  - Sonderfall leeres Repo: GitHub liefert für `/commits` auf einem Repo ohne Commits HTTP 409 statt einer leeren Liste — wird explizit als "keine Commits" (AC-9), nicht als Fehler behandelt
  - Gibt die drei Listen gebündelt als JSON zurück

Es gibt keine schreibenden Operationen.

Fehlerfälle (strukturiert, nie als rohe Exception):
- Repo nicht gefunden/nicht sichtbar → Fehlertyp "not_found", HTTP 404 (AC-5)
- Kein Token konfiguriert ODER GitHub antwortet mit 401 → Fehlertyp "token" (wie PROJ-1, HTTP 401)
- Rate-Limit/Netzwerkfehler → Fehlertyp "unavailable", HTTP 503, Client zeigt Retry (AC-6)
```

## Dependencies

Keine neuen externen Pakete — dieselbe Basis wie PROJ-1 (`fetch`, `Intl.RelativeTimeFormat`, vorhandene shadcn/ui-Komponenten).

## Technische Entscheidungen

| Entscheidung | Begründung | Alternative erwogen | Trade-off | Datum |
|---|---|---|---|---|
| `RepoListErrorType` (PROJ-1) um `"not_found"` erweitert statt eines komplett neuen Fehlertyps | Ein gemeinsamer Fehlertyp für alle GitHub-Client-Fehler — Route Handler und `GithubApiError`-Klasse bleiben einheitlich | Eigener `RepoDetailErrorType` parallel zu `RepoListErrorType` | PROJ-1s `ERROR_TITLES`/`STATUS_BY_ERROR_TYPE`-Lookups müssen einen (nie ausgelösten) `"not_found"`-Fall ergänzen, damit TypeScript exhaustiv bleibt — minimaler, ungefährlicher Zusatz | 2026-08-28 |
| `ErrorState.onRetry` optional statt einer eigenen `NotFoundState`-Komponente | Eine Komponente weniger, gleiches visuelles Muster für alle Fehlerzustände | Eigene `NotFoundState`-Komponente | Etwas generischere Component-API (ein Prop mehr optional) statt eines expliziten Namens | 2026-08-28 |
| Commits/offene PRs/geschlossene PRs parallel laden (`Promise.all`), erst nach dem Existenz-Check | Ein 404 auf `/repos/{owner}/{repo}` spart drei unnötige Folge-Requests; die drei Listen sind unabhängig voneinander, parallel ist schneller als sequenziell | Alles sequenziell laden | Ein zusätzlicher Roundtrip vor den drei Parallel-Calls, aber vernachlässigbar bei einem lokalen Ein-Personen-Tool | 2026-08-28 |
| 409 auf `/commits` explizit als "leeres Repo" (AC-9) statt als Fehler behandelt | Das ist GitHubs dokumentiertes Verhalten für Repos ohne Commits — ein Fehler wäre hier fachlich falsch | 409 wie jeden anderen Fehler behandeln (würde AC-9 verletzen) | Ein zusätzlicher Sonderfall im Client-Code | 2026-08-28 |
| Race-Schutz (EC-3) über denselben `AbortController`-Mechanismus wie PROJ-1 | Konsistentes, bereits bewährtes Muster, keine neue Lösung nötig | Sequenznummer-Vergleich | Keiner — identische Lösung wie PROJ-1 | 2026-08-28 |

## Offene Fragen

Keine.

## Umsetzungsnotizen (aus /build)

- **Gemeinsamer Bug mit PROJ-1 gefunden und gefixt:** Die CSP in `src/lib/security-headers.ts` blockierte den Google-Fonts-`@import` aus `globals.css` (`style-src`/`font-src` erlaubten `fonts.googleapis.com`/`fonts.gstatic.com` nicht) — Orbitron/JetBrains Mono luden seit PROJ-1 nie, die App lief durchgehend auf Fallback-Fonts. Fix betrifft beide Features, siehe `features/PROJ-1-repo-overview/qa-report.md` → BUG-1 für Details.
- `formatRelativeTime` aus `repo-card.tsx` nach `src/lib/format.ts` extrahiert, da jetzt 3 Aufrufer (RepoCard, CommitSection, PullRequestSection) — keine vorzeitige Abstraktion, sondern Refactor bei echtem zweiten/dritten Bedarf.
- `ErrorState.onRetry` wie in `design.md` geplant optional gemacht — bei `not_found` wird kein Retry-Button gerendert.
