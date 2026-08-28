# QA Test Results

**Tested:** 2026-08-28
**App URL:** http://localhost:3002 (Port 3000 war belegt, `next dev` ist automatisch auf 3002 ausgewichen)
**Tester:** QA Engineer (AI)

> Legende: `[x]` in diesem Durchlauf verifiziert (mit Beleg) · `[ ] BUG` als defekt verifiziert · `[!] NOT VERIFIED` in diesem Durchlauf nicht prüfbar (mit Grund)

### Acceptance Criteria Status

#### AC-1: Repo-Liste laden, filtern, sortieren
- [x] Filter (kein archived/fork) + Sortierung (absteigend nach updatedAt) — Beleg: `src/app/api/repos/route.test.ts` Test "gibt gefilterte, sortierte Repos zurück" (4 Repos rein, 2 raus gefiltert, korrekte Reihenfolge)
- [!] NOT VERIFIED — Live-Aufruf gegen die echte GitHub-API: kein `GITHUB_TOKEN` in `.env.local` vorhanden (Claude darf diese Datei nicht lesen/schreiben, siehe `.claude/rules/security.md`). `curl http://localhost:3002/api/repos` liefert daher nur den Token-Fehlerpfad (AC-5), nicht den Erfolgspfad. Menschliche Aktion nötig: echten Token eintragen, dann erneut prüfen.

#### AC-2: Repo-Karte zeigt Name, Sichtbarkeit, Sprache, PR-Zahl, Zeitpunkt
- [x] Alle fünf Felder werden gerendert — Beleg: `src/components/repo-card.test.tsx` Test "zeigt Name, Sichtbarkeit, Sprache und PR-Zahl" (Assertions auf Name, "privat"-Badge, Sprache, PR-Zahl); relative Zeit ist Teil der Card, Formatierung separat unter EC-2/Code geprüft (`formatRelativeTime`, `src/components/repo-card.tsx:12-27`)
- [!] NOT VERIFIED — visuelle Kontrolle mit echten Daten (Screenshot mit echten Repos) — kein Token verfügbar, siehe AC-1

#### AC-3: Leerzustand ohne aktive Repos
- [x] API liefert bei leerer Liste `{ok:true, repos:[]}`, kein Fehler — Beleg: `src/app/api/repos/route.test.ts` Test "behandelt eine leere Repo-Liste nicht als Fehler" (Status 200)
- [x] UI mappt leere Liste auf EmptyState — Beleg: Code-Inspektion `src/app/page.tsx:38` (`result.repos.length === 0 ? {status:"empty"} : ...`) und `:69` (rendert `<EmptyState>`)

#### AC-4: Ladezustand
- [x] Initialer State ist "loading", rendert Skeleton — Beleg: Code-Inspektion `src/app/page.tsx:22` (`useState<ViewState>({status:"loading"})`) und `:63`
- [!] NOT VERIFIED — visuelle Bestätigung des Skeletons per Screenshot: Antwortzeit lokal zu schnell, um den Zustand zuverlässig einzufangen (kein DevTools-Throttling in diesem Durchlauf)

#### AC-5: Fehlermeldung bei fehlendem/ungültigem Token
- [x] `curl -D - http://localhost:3002/api/repos` → HTTP 401, Body `{"ok":false,"error":{"type":"token","message":"Kein GitHub-Token konfiguriert (GITHUB_TOKEN fehlt in .env.local)"}}` — kein Stacktrace, klare Meldung
- [x] UI zeigt die Fehlermeldung korrekt inkl. Retry-Button — Beleg: Playwright-Screenshot (siehe `/build`-Sitzung), Titel "GitHub-Token fehlt oder ist ungültig" + Meldungstext + Button "Erneut versuchen" sichtbar

#### AC-6: Fehlermeldung bei Rate-Limit/Netzwerkfehler
- [x] Client wirft `unavailable` bei 403+`x-ratelimit-remaining:0` und bei Netzwerkfehlern — Beleg: `src/lib/github/client.test.ts` Tests "wirft 'unavailable' bei Rate-Limit" und "wirft 'unavailable' bei einem Netzwerkfehler"
- [x] Route Handler mappt `unavailable` auf HTTP 503 — Beleg: `src/app/api/repos/route.test.ts` Test "mappt einen Unavailable-Fehler auf HTTP 503"
- [x] UI-Komponente ist dieselbe wie bei AC-5 (ErrorState mit Retry) — Beleg: `src/app/page.tsx:65-67`, visuell für AC-5 bereits bestätigt (identische Komponente, nur andere Props)

#### AC-7: Klick auf Karte navigiert zur Detailansicht
- [x] `<Link>` zeigt auf `/repos/{fullName}` — Beleg: `src/components/repo-card.test.tsx` Test "verlinkt zur Detailroute des Repos" (`href="/repos/octocat/my-repo"`)
- [!] NOT VERIFIED — tatsächlicher Klick + Navigation im Browser mit echten Daten (kein Token, siehe AC-1). Die Zielseite `/repos/[owner]/[repo]` existiert noch nicht — das ist erwartungsgemäß PROJ-2, siehe spec.md → Out of Scope.

#### AC-8: Token bleibt serverseitig
- [x] `GITHUB_TOKEN` wird ausschließlich in `src/lib/github/client.ts:31` gelesen — Beleg: `grep -rn GITHUB_TOKEN src/` findet nur `client.ts` und dessen eigene Testdatei
- [x] `client.ts` wird ausschließlich von `src/app/api/repos/route.ts` importiert (Server-only Route Handler) — Beleg: `grep -rn 'from "@/lib/github/client"' src/` → ein einziger Treffer
- [x] Die JSON-Antwort von `/api/repos` enthält nur die gemappten `Repo`-Felder, kein Token — Beleg: `curl`-Antwort oben, sowie `route.ts:20-27` (explizites Field-Mapping statt Spread des rohen GitHub-Objekts)

### Edge Cases Status

#### EC-1: Pagination über 100 Repos hinweg
- [x] Zwei-Seiten-Antwort wird korrekt zusammengeführt (101 Repos, 2 Fetch-Aufrufe) — Beleg: `src/lib/github/client.test.ts` Test "lädt alle Repos über mehrere Seiten hinweg"

#### EC-2: Kein erkennbares Sprach-Label
- [x] Platzhalter "—" statt leerem/kaputtem Element — Beleg: `src/components/repo-card.test.tsx` Test "zeigt einen Platzhalter, wenn keine Sprache erkannt wurde"

#### EC-3: Überlappende Ladevorgänge (Race Condition)
- [x] Garantie aus `design.md` ("jeder neue Ladevorgang bricht einen laufenden ab") im Code bestätigt — Beleg: `src/app/page.tsx:26` (`abortRef.current?.abort()` vor jedem neuen Request) sowie `:33` und `:41` (`if (controller.signal.aborted) return;` vor jedem `setState` — eine abgebrochene ältere Antwort kann den State nie mehr überschreiben)

#### EC-4: Leere Antwort trotz Erfolgsstatus
- [x] Wird wie AC-3 behandelt, nicht als Fehler — Beleg: `src/app/api/repos/route.test.ts` Test "behandelt eine leere Repo-Liste nicht als Fehler (EC-4)"

#### EC-5: Token ohne volle Berechtigungen
- [x] Code trifft keine Annahme über eine erwartete Gesamtzahl an Repos — Beleg: Code-Inspektion `route.ts`/`client.ts`, es gibt keinen Vergleich gegen eine erwartete Anzahl; die GitHub-API selbst liefert bei eingeschränktem Token-Scope nur die sichtbaren Repos zurück, was der Code unverändert durchreicht (kein künstlicher Fehlerpfad für "zu wenige Repos")

### Security Audit Results

- [!] NOT VERIFIED — Authentication/Authorization: entfällt, dieses Feature hat laut Spec bewusst kein Login/Multi-User (Ein-Personen-Tool, siehe `spec.md` → Out of Scope). Kein Check sinnvoll durchführbar.
- [x] Kein Query-Parameter-/Body-Input an `/api/repos` — Beleg: Code-Inspektion `route.ts`, `GET()` verarbeitet keine `searchParams` oder Request-Body → keine klassische Injection-Angriffsfläche auf diesem Endpoint
- [!] NOT VERIFIED — Rate Limiting auf `/api/repos` selbst: nicht implementiert, für ein rein lokales Ein-Personen-Tool ohne öffentlichen Zugriff optional (kein Credential-Check-Endpoint, daher kein Hard-Gate)
- [x] Brute Force auf Credentials: entfällt — Projekt hat kein Login/Signup/Passwort-Reset (siehe PRD Non-Goals)
- [x] Keine Formulare mit Credentials in diesem Feature → keine Credentials in der URL möglich
- [x] Keine Secrets im Client-Bundle — Beleg: `GITHUB_TOKEN` wird nirgends mit `NEXT_PUBLIC_`-Präfix verwendet, ausschließlich in `client.ts` (server-only, siehe AC-8-Belege oben) gelesen; `grep -rn NEXT_PUBLIC_ src/lib/github/` → kein Treffer
- [x] Keine sensiblen Daten in der API-Antwort — Beleg: `route.ts` mappt explizit nur `id/name/fullName/visibility/language/openPRCount/updatedAt`, kein `...repo`-Spread des rohen GitHub-Objekts (das u. a. Owner-E-Mail-Verknüpfungen, SSH-URLs etc. enthalten könnte)

### E2E Tests
_Optionale Ebene — wird von `/e2e-tests` für kritische Kernabläufe geschrieben._

- Status: **nicht ausgeführt** (`/e2e-tests` für kritische Abläufe)
- Hinweis: `tests/auth.spec.ts` existiert bereits im Repo, stammt aber aus dem Kit-Scaffold und testet den (in diesem Projekt ungenutzten) `/login`-Flow — nicht Teil von PROJ-1s Scope, deshalb hier nicht als Regression mitgelaufen. Das Playwright-Browser-Install wurde bewusst nicht angestoßen (gehört laut Skill-Vorgabe zu `/e2e-tests`).

### Not Verified In This Run

- [!] AC-1 / AC-2 / AC-7 Live-Verhalten mit echten GitHub-Daten — kein `GITHUB_TOKEN` in `.env.local` verfügbar (Claude darf diese Datei nicht lesen/schreiben). **Menschliche Aktion nötig:** echten Personal Access Token in `.env.local` eintragen (Key: `GITHUB_TOKEN`, Scope `repo` für private Repos), danach diesen QA-Durchlauf für AC-1/AC-2/AC-7 wiederholen.
- [!] AC-4 visuelle Bestätigung des Skeleton-Ladezustands — Antwort lokal zu schnell für einen zuverlässigen Screenshot
- [!] Cross-Browser-Rendering (Chrome/Firefox/Safari) — `/qa` läuft ohne Browser; nur `/e2e-tests` deckt das ab
- [!] Responsive Layout bei 768px/1440px — 375px wurde während `/build` per Playwright stichprobenartig geprüft (sah korrekt aus), aber nicht Teil dieses unabhängigen QA-Durchlaufs
- [!] Rate Limiting auf `/api/repos` — nicht implementiert, optional für dieses Projekt (siehe Security-Audit)

### Bugs Found

Keine Bugs gefunden. Der einzige während des Testens entdeckte Defekt (Supabase-Auth-Gate in `src/proxy.ts` blockierte `/api/repos`) wurde bereits während `/build` behoben und ist Teil des Commits `ac8bdb5` — siehe `design.md` → Umsetzungsnotizen. Keine offenen Bugs zum Zeitpunkt dieses QA-Durchlaufs.

### Summary
- **Acceptance Criteria:** 8/8 zumindest teilweise verifiziert (Filter-/Sortier-/Fehler-/Edge-Case-Logik vollständig durch Tests belegt), davon 3 (AC-1, AC-2, AC-7) mit einem offenen Live-Daten-Teilaspekt, der einen echten GitHub-Token erfordert
- **Bugs Found:** 0 offen (1 gefunden und bereits während `/build` gefixt)
- **Security:** 5/7 Checks verifiziert, 2 NOT VERIFIED (Rate-Limiting auf `/api/repos` — nicht implementiert/optional; Auth/Authorization — entfällt für dieses Feature)
- **Production Ready:** JA, unter Vorbehalt — siehe unten
- **Recommendation:** Aus reiner Bug-Sicht bereit für den nächsten Schritt. Da dieses Projekt kein Deployment vorsieht (`docs/PRD.md` → Non-Goals: "Kein Deployment/Hosting"), ist das eigentliche "Production Ready" hier: **funktioniert bei dir lokal mit echtem Token.** Das kann nur der Mensch abschließend bestätigen, sobald `GITHUB_TOKEN` in `.env.local` steht.

> "Production Ready: JA" heißt *keine Critical/High-Bugs* — nicht, dass alles geprüft wurde. Die drei NOT-VERIFIED-Punkte zu echten GitHub-Daten bleiben offen, bis ein Token verfügbar ist.
