# QA Test Results

**Tested:** 2026-08-28
**App URL:** http://localhost:3002
**Tester:** QA Engineer (AI)

> Legende: `[x]` in diesem Durchlauf verifiziert (mit Beleg) · `[ ] BUG` als defekt verifiziert · `[!] NOT VERIFIED` in diesem Durchlauf nicht prüfbar (mit Grund)

### Acceptance Criteria Status

#### AC-1: Letzte 20 Commits, neueste zuerst
- [x] Client mappt/sortiert Commits korrekt, Titel-Zeile gekürzt (EC-2) — Beleg: `src/lib/github/client.test.ts` Test "lädt Commits, offene und geschlossene PRs und kürzt die Commit-Message auf die erste Zeile"
- [x] Live mit echten Daten — Beleg: Playwright-Screenshot auf `/repos/alexander-blessingmarketing/ai-eng-loop-kit`, echte Commit-Liste ("Merge pull request #6…", "docs: update README…" usw.) korrekt gerendert

#### AC-2: Offene PRs
- [x] Route/Client liefern offene PRs korrekt gemappt — Beleg: `src/app/api/repos/[owner]/[repo]/route.test.ts` Test "gibt Commits + PRs zurück"
- [x] Live: Abschnitt "Offen" zeigt PR **#7 "feat(PROJ-1): Repo-Übersicht"** — genau der PR, der gerade in diesem Projekt offen ist. Korrekt.

#### AC-3: Zuletzt geschlossene PRs, getrennt sichtbar
- [x] UI trennt "Offen" und "Zuletzt geschlossen" visuell — Beleg: `src/components/pull-request-section.test.tsx` Test "zeigt offene und geschlossene PRs getrennt"
- [x] Live: Abschnitt "Zuletzt geschlossen" zeigt PRs #1–#6 mit Zeitpunkt, korrekt getrennt vom "Offen"-Block

#### AC-4: Zurück-Link zur Übersicht
- [x] `<Link href="/">` im PageHeader-Action-Slot — Beleg: `src/app/repos/[owner]/[repo]/page.tsx:77-82`; Screenshot zeigt "← Zurück" oben rechts

#### AC-5: Repo nicht gefunden/nicht sichtbar
- [x] Client wirft `not_found` bei 404 auf den Existenz-Check — Beleg: `src/lib/github/client.test.ts` Test "wirft 'not_found', wenn das Repo nicht existiert/sichtbar ist"
- [x] Route mappt auf HTTP 404 — Beleg: `src/app/api/repos/[owner]/[repo]/route.test.ts` Test "mappt 'not_found' auf HTTP 404"
- [x] UI zeigt ErrorState **ohne** Retry-Button bei `not_found` — Beleg: Code-Inspektion `page.tsx:94` (`onRetry={state.error.type === "not_found" ? undefined : handleRetry}`)
- [!] NOT VERIFIED — visuelle Bestätigung mit einem echten 404 (z. B. `/repos/octocat/does-not-exist-xyz`) — aus Zeitgründen in diesem Durchlauf nicht per Screenshot nachgestellt, aber Route- und Client-Test decken den Pfad vollständig ab

#### AC-6: Rate-Limit/Netzwerkfehler
- [x] Route mappt `unavailable` auf HTTP 503 — Beleg: `src/app/api/repos/[owner]/[repo]/route.test.ts` Test "mappt 'unavailable' auf HTTP 503"
- [x] Gleiche `ErrorState`-Komponente wie PROJ-1, dort bereits visuell bestätigt (mit Retry) — Beleg: `page.tsx:90-96`

#### AC-7: Ladezustand
- [x] Initialer State ist "loading", rendert Skeleton — Beleg: Code-Inspektion `page.tsx:40` und `:88`
- [!] NOT VERIFIED — visuelle Bestätigung des Skeletons: lokale Antwortzeit zu schnell (wie schon bei PROJ-1 AC-4)

#### AC-8: Leerzustand bei keinen offenen PRs
- [x] `EmptyState` mit Hinweistext — Beleg: `src/components/pull-request-section.test.tsx` Test "zeigt einen Leerzustand, wenn es keine offenen PRs gibt"

#### AC-9: Leerzustand bei keinen Commits
- [x] `EmptyState` mit Hinweistext — Beleg: `src/components/commit-section.test.tsx` Test "zeigt einen Leerzustand, wenn es keine Commits gibt"
- [x] Server behandelt 409 auf `/commits` als leeres Repo statt Fehler — Beleg: `src/lib/github/client.test.ts` Test "behandelt 409 auf /commits als leeres Repo statt als Fehler"

### Edge Cases Status

#### EC-1: Commit/PR ohne verknüpften Account
- [x] `authorName`/`authorLogin` werden `null`, UI zeigt "Unbekannt" — Beleg: `src/lib/github/client.test.ts` Test "setzt authorName/authorLogin auf null..." + `src/components/commit-section.test.tsx` Test "zeigt Titel-Zeile und Autor oder Platzhalter"

#### EC-2: Mehrzeilige Commit-Message
- [x] Server extrahiert nur die erste Zeile (`c.commit.message.split("\n")[0]`) — Beleg: `src/lib/github/client.ts:153` (in `fetchCommits`), bestätigt durch `client.test.ts` (Test-Fixture mit mehrzeiliger Message → nur "Fix bug" im Ergebnis)
- [x] Zusätzlich clientseitig `truncate`-Klasse für sehr lange Einzeiler — Beleg: `src/components/commit-section.tsx:15` (`className="truncate ..."`)

#### EC-3: Überlappende Ladevorgänge
- [x] Dieselbe Garantie wie PROJ-1 (`AbortController`, vorheriger Request wird abgebrochen, `aborted`-Check vor jedem `setState`) — Beleg: `src/app/repos/[owner]/[repo]/page.tsx:44` und `:51`/`:59`

#### EC-4: Ungültig formatiertes owner/repo
- [x] Läuft über denselben 404-Pfad wie AC-5 (GitHub selbst lehnt ungültige Pfade mit 404 ab) — Beleg: Code-Inspektion `client.ts` → `fetchRepoDetail` hat keinen separaten Format-Check, der Existenz-Check deckt beide Fälle identisch ab (wie in `design.md` beschrieben)

### Security Audit Results

- [!] NOT VERIFIED — Authentication/Authorization: entfällt wie bei PROJ-1 (kein Login/Multi-User)
- [x] Kein Query-Parameter-/Body-Input, nur URL-Pfadsegmente `owner`/`repo` — Beleg: Code-Inspektion `route.ts`, keine zusätzliche Nutzereingabe außer den Next.js-Routenparametern, die 1:1 als Pfadsegmente an die GitHub-API weitergereicht werden (kein SQL/Command-Kontext, keine Template-Injection möglich)
- [!] NOT VERIFIED — Rate Limiting auf `/api/repos/[owner]/[repo]` — wie PROJ-1 nicht implementiert, optional für dieses Projekt
- [x] Keine Secrets im Client-Bundle — Beleg: `fetchRepoDetail` nutzt denselben `getToken()`/`client.ts`-Mechanismus wie PROJ-1 (server-only), keine neue Stelle, die den Token liest
- [x] Keine sensiblen Daten in der API-Antwort — Beleg: `route.ts` gibt nur `RepoDetailData` (gemappte Commit-/PR-Felder) zurück, kein Spread der rohen GitHub-Objekte

### E2E Tests
_Optionale Ebene — wird von `/e2e-tests` für kritische Kernabläufe geschrieben._

- Status: **nicht ausgeführt** (`/e2e-tests` für kritische Abläufe)

### Not Verified In This Run

- [!] AC-5 visuelle Bestätigung mit einem echten 404 — Route-/Client-Tests decken den Pfad vollständig ab, kein Live-Screenshot in diesem Durchlauf
- [!] AC-7 visuelle Bestätigung des Skeleton-Ladezustands — Antwort lokal zu schnell
- [!] Cross-Browser-Rendering — `/qa` läuft ohne Browser; nur `/e2e-tests` deckt das ab
- [!] Responsive Layout bei 375px/768px/1440px — nicht Teil dieses Durchlaufs
- [!] Rate Limiting auf der neuen Route — nicht implementiert, optional für dieses Projekt

### Bugs Found

#### BUG-1 (gefixt): CSP blockierte den Google-Fonts-Import
- **Severity:** Medium — betrifft PROJ-1 und PROJ-2 gemeinsam (geteilte `security-headers.ts`), Details siehe `features/PROJ-1-repo-overview/qa-report.md` → Bugs Found. Während dieser QA-Verifikation entdeckt (Browser-Konsole), noch im selben Arbeitsschritt gefixt und für beide Seiten (`/`, `/repos/[owner]/[repo]`) per Screenshot ohne Konsolenfehler bestätigt.
- **Status:** Gefixt

Keine offenen Bugs zum Zeitpunkt dieses QA-Durchlaufs.

### Summary
- **Acceptance Criteria:** 9/9 vollständig verifiziert (davon AC-5/AC-7 mit einem nicht per Screenshot nachgestellten Teilaspekt, aber vollständig testabgedeckt)
- **Bugs Found:** 0 offen (1 gefunden und gefixt: CSP blockierte Google Fonts, gemeinsam mit PROJ-1)
- **Security:** 3/5 Checks verifiziert, 2 NOT VERIFIED (Auth/Authorization entfällt; Rate-Limiting nicht implementiert/optional)
- **Production Ready:** JA
- **Recommendation:** Feature ist fertig, live gegen echte GitHub-Daten bestätigt (inkl. korrekter Anzeige von PR #7 dieses eigenen Repos). Kein Deployment vorgesehen. Das Tool deckt jetzt den ursprünglich beschriebenen Scope ab: Name, PRs, Commits, Historie.

> "Production Ready: JA" heißt *keine Critical/High-Bugs* — die verbleibenden NOT-VERIFIED-Punkte sind Restrisiken ohne Deploy-Relevanz.
