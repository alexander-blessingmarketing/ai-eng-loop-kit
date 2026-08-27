# AI Engineering Kit

> Built with the AI Engineering Kit — a spec-driven workflow for Claude Code.

<!-- AI-ENG-KIT:START (managed — do not edit by hand; refreshed by /verify-setup) -->
## AI Engineering Workflow

This project uses the AI Engineering Kit — a spec-driven workflow. Development runs in phases, each driven by a skill:

`/init → /write-spec → /architecture → /tasks → /build → /qa → /deploy`   (`/refine` & `/audit` anytime · `/dsgvo` when personal data is involved · `/e2e-tests` for critical flows · `/security-check` & `/cleanup` after `/deploy`)

- **Feature specs** live in `features/PROJ-X-name/`: `spec.md` (the contract — WHAT), `design.md` (the technical design — HOW), `tasks.md` (the ordered build plan), `qa-report.md` (the test report).
- **Acceptance Criteria** carry stable IDs (`AC-1`, `AC-2`, …). The chain is **AC → Task → Test**.
- **Project status** is tracked in `features/INDEX.md`.
- `spec.md` is **read-only during `/build`** — it is the stable contract.
- **One working language** for the whole project — the conversation *and* every document the skills write, acceptance criteria included. It is recorded under Key Conventions below.

@.claude/rules/general.md
@.claude/rules/security.md
<!-- AI-ENG-KIT:END -->

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (copy-paste components)
- **Backend:** Supabase (PostgreSQL + Auth + Storage) - optional
- **Deployment:** Vercel or Hostinger (GitHub-connected auto-deploy)
- **Validation:** Zod + react-hook-form
- **State:** React useState / Context API

## Project Structure

```
src/
  app/              Pages (Next.js App Router)
  components/
    ui/             shadcn/ui components (NEVER recreate these)
  hooks/            Custom React hooks
  lib/              Utilities (supabase.ts, utils.ts)
supabase/
  migrations/       Schema changes as .sql files (one per change)
tests/              Playwright E2E tests (added by /e2e-tests)
features/           Feature specs, one folder per feature
  PROJ-X-name/      spec.md, design.md, tasks.md, qa-report.md
  INDEX.md          Feature status overview
docs/
  PRD.md            Product Requirements Document
  data-model.md     App-wide data model (entities + relationships); built by /init, refined by /architecture
  app-shell.md      App-wide frame (navigation, layout regions, page pattern); built by /init, refined by /architecture
  privacy.md        What personal data the product processes, why, how long; kept current by /dsgvo
  production/       Production guides (Sentry, security, performance)
```

## Key Conventions

- **Working language: Deutsch.** Talk to the user in Deutsch and write every project document in Deutsch — see `.claude/rules/general.md` → Working Language.
- **⚠️ Einmalig pro neuem Projekt: Branch-Schutz aktivieren.**
  `/verify-setup` ist eine managed Skill des Kits und kennt diese Fork-Ergänzung nicht. Sie meldet „bereit", ohne dass `main` geschützt ist — **wer sich darauf verlässt, arbeitet ungeschützt weiter.**

  Die Git-Hooks erledigt `npm install` selbst (`scripts/postinstall.mjs`). Offen bleibt das serverseitige Ruleset, weil es einen gepushten `main` und ein angemeldetes `gh` braucht:

  ```bash
  git push -u origin main          # muss VOR dem Ruleset passieren
  bash scripts/setup-ruleset.sh    # importiert .github/rulesets/main.json
  ```

  **Reihenfolge ist Pflicht:** Das Ruleset verlangt einen PR für jede Änderung an `main` — auch für den ersten Push, der `main` erst anlegt. Umgekehrt sperrt man sich aus. Das Skript prüft das selbst und überspringt sich, solange `main` fehlt.

  **Wenn der Nutzer nach `/verify-setup` oder `/init` fragt, wie es weitergeht: diesen Schritt aktiv nennen, falls er noch aussteht.** Prüfen mit:
  `gh api repos/{owner}/{repo}/rulesets --jq 'length'` — `0` heißt ungeschützt.
- **Feature IDs:** PROJ-1, PROJ-2, etc. (sequential)
- **Commits:** `feat(PROJ-X): description`, `fix(PROJ-X): description`
- **Single Responsibility:** One feature per folder
- **⚠️ Feature-Branch und Pull Request macht der Agent — zu Beginn der Feature, nicht vor `/build`.**
  Das weicht bewusst von `.claude/rules/general.md` ab, wo steht: *„The user creates the branch before `/build` — skills never create or switch branches on their own."* **Diese Konvention hier gewinnt.** `general.md` ist managed und wird von `create-ai-eng-app update` überschrieben — nach jedem Update gegenprüfen.

  **Ablauf — der Agent führt ihn aus, ohne dass der Nutzer Git kennen muss:**

  1. **Bei `/write-spec`, noch vor dem ersten Commit:** Branch `feat/PROJ-X-name` anlegen und darauf wechseln. In einem Satz sagen, was das heißt — etwa: „Ich arbeite ab jetzt auf einem eigenen Zweig, damit die laufende Version unberührt bleibt."
  2. **Nach dem ersten Commit:** pushen und einen **Draft-Pull-Request** gegen `main` öffnen (`gh pr create --draft`). Den Link nennen.
  3. **Jeder weitere Commit wird gepusht** — von `/architecture`, `/tasks`, `/build`, `/qa`, `/e2e-tests`.
  4. **`/deploy`** setzt den PR auf „ready for review" statt einen neuen zu öffnen, und wartet auf den Merge durch den Menschen.

  **Zwei Gründe, beide praktisch:**

  *Ohne Branch von Anfang an landen drei Commits auf `main`.* `/write-spec`, `/architecture` und `/tasks` committen alle, bevor die Kit-Regel den Branch vorsieht. Diese Commits lassen sich hier nie pushen — Hook und Ruleset lehnen ab. Sie stapeln sich lokal, bis jemand branched. Prüfen mit `git log --oneline origin/main..main`.

  *Ohne frühen PR läuft keine CI.* Lint, Typecheck, Tests und E2E hängen am Pull Request. Öffnet ihn erst `/deploy`, kommt die erste Rückmeldung nach Stunden Arbeit — gebündelt, am Ende, wenn Korrigieren am teuersten ist. Und bis dahin liegt alles nur auf einem Rechner.

  **Wenn `gh` fehlt oder nicht angemeldet ist:** Branch trotzdem anlegen, den Push und den PR in Klartext an den Nutzer übergeben, mit dem fertigen Befehl. Nicht stillschweigend überspringen — sonst fehlt die CI, ohne dass es jemand merkt.
- **⚠️ „Fertig" heißt: `lint`, `typecheck`, `build` und `test` sind grün — alle vier.**
  `/build` nennt als Abnahmekriterium nur *„`npm run build` and `npm test` pass"*, `/qa` prüft `npm test`. **Lint und Typecheck kommen in beiden nicht vor.** `.ai-eng-kit` kennt `commands.lint`, benutzt wird es aber nur von `/deploy` — also ganz am Ende. `typecheck` steht dort gar nicht.

  Praktische Folge, real passiert: Vier Features lang lief ein `react-hooks/set-state-in-effect`-Fehler mit. `/qa` meldete „Approved, Production Ready", die CI war rot. Aufgefallen ist es erst beim ersten Push — nach Stunden Arbeit.

  **Deshalb führt der Agent am Ende von `/build` und `/qa` alle vier aus:**

  ```bash
  npm run lint && npm run typecheck && npm run build && npm test
  ```

  Rot heißt: nicht fertig. Das gilt auch für Lint — ein Linter-Fehler ist kein Schönheitsfehler, sondern die CI, die den Merge blockiert.

  **Kein `eslint-disable`, um einen Fehler wegzubekommen.** Die Regel hat einen Grund; wer sie abschaltet, verschiebt das Problem in die Laufzeit. Ausnahmen gehören begründet und mit `--` kommentiert, wie in `src/components/cookie-consent.tsx`.

- **⚠️ Wann deployed wird, ist eine Projektentscheidung — keine Vorgabe des Ablaufs.**
  Nach bestandener QA bieten `/qa` und `/help` nur zwei Wege an: `/e2e-tests` oder `/deploy`. **„Weiter mit dem nächsten Feature" nennen beide nicht** — die Option ist damit praktisch unsichtbar, obwohl `general.md` sagt, Übergaben seien immer nutzerinitiiert.

  **Deshalb nennt der Agent nach jeder QA alle drei Möglichkeiten**, ohne zu drängen:
  - `/e2e-tests` — bei kritischen Journeys
  - `/write-spec` — nächstes Feature
  - `/deploy` — ausliefern

  **Welcher davon der richtige ist, steht in `docs/PRD.md` → Constraints**, als eine Zeile, analog zur `Environment strategy`:

  - `Deploy strategy: per-feature` — jedes fertige Feature geht live. Infrastrukturprobleme fallen früh und einzeln auf.
  - `Deploy strategy: milestone` — erst wenn ein zusammenhängender Stand steht. Weniger Deploy-Zyklen, dafür schlagen Infrastrukturprobleme gebündelt auf.

  **`/init` fragt das ab**, sobald ein Backend gewählt wurde. Fehlt die Zeile in einem älteren Projekt: einmal nachfragen und eintragen, nicht raten.

  **Was der Agent beisteuert, wenn er `/deploy` nennt:** Beim **ersten** Deploy einmal darauf hinweisen, dass dabei ein gehostetes Supabase-Projekt entsteht — mit der Region, die sich **nie mehr ändern lässt** — plus echter Datenbank, echter Auth und damit einer DSGVO-Fläche. Danach nicht mehr; einmal gesagt reicht.

  `/deploy` kommt mit beiden Strategien zurecht: Es promotet alle ausstehenden Migrationen in einem Rutsch und in der richtigen Reihenfolge, mit `db push --dry-run` und Klartext-Zusammenfassung vorher. Fünf Migrationen auf einmal sind kein Sonderfall.

- **⚠️ Nichts geht direkt nach `main` — `/deploy` merged NICHT selbst, sondern übergibt an den Pull Request.**
  Das weicht bewusst von der Skill `/deploy` (Schritt 3) und von `.claude/rules/general.md` ab, die beide einen direkten Merge beschreiben. **Diese Konvention hier gewinnt.** Beide Dateien sind managed und werden von `create-ai-eng-app update` überschrieben — nach jedem Update gegenprüfen, ob diese Zeile noch greift.

  Ablauf: `/deploy` führt seine Vorabprüfungen und die DB-Promotion wie beschrieben aus. Statt zu mergen setzt es den **bereits offenen Draft-PR** (siehe oben) auf „ready for review" — `gh pr ready` — und **wartet**. Nach grüner CI merged der Mensch, danach macht `/deploy` mit Verifikation und Bookkeeping weiter.

  Existiert wider Erwarten kein PR, legt `/deploy` einen an, statt zu mergen.

  **Grund:** `.github/workflows/e2e.yml` triggert ausschließlich auf `pull_request`. Es wartet auf die Vercel-Preview und testet gegen diese — also gegen ein echtes Deployment, bevor es live geht. Ohne PR läuft dieser Workflow **nie**, ohne Fehlermeldung und ohne roten Haken. Ein direkter Merge würde die einzige Stelle entfernen, an der eine Regression vor Produktion auffällt. (`ci.yml` läuft auf PR *und* Push, ist also nicht betroffen.)

  **Durchgesetzt wird das lokal, nicht auf GitHub.** Branch Protection und Rulesets brauchen bei privaten Repos GitHub Pro — im Free-Plan liefert die API dafür `403`. Ersatz ist der versionierte Hook `.githooks/pre-push`, der Pushes auf `main` ablehnt.

  Einmalig pro Klon zu aktivieren (`scripts/bootstrap.sh` erledigt das mit):

  ```bash
  git config core.hooksPath .githooks
  ```

  Notausgang, wenn es wirklich sein muss: `ALLOW_MAIN_PUSH=1 git push origin main`.

  Der Hook ist schwächer als serverseitiger Schutz — er wirkt nur auf Rechnern, die ihn aktiviert haben. Er fängt aber den Fall, um den es geht: den versehentlichen Push. Sobald das Repo öffentlich wird oder ein Pro-Plan existiert, gehört zusätzlich echte Branch Protection auf `main`.
- **shadcn/ui first:** NEVER create custom versions of installed shadcn components
- **App shell:** navigation, layout regions, and the page pattern live in `docs/app-shell.md` and belong to the feature recorded there. Reuse those components — never add a second sidebar, header, or nav inside a feature. Changing how the shell behaves is a `/refine` on its owning feature.
- **Parallel build:** `/build` runs file-disjoint [P] tasks from `tasks.md` as isolated subagents
- **Human-in-the-loop:** All workflows have user approval checkpoints
- **Secrets / env files:** Never read, edit, or create `.env.local` (it's permission-blocked and holds your private keys). To document a variable, add a placeholder to `.env.local.example` (the one env file Claude may edit). When a real value is needed, Claude asks you in chat what to paste into `.env.local` — it never writes it itself.
- **Tests:** Unit tests co-located next to source files (`useHook.test.ts` next to `useHook.ts`), written by `/qa`. E2E tests live in `tests/`, added on demand by `/e2e-tests` for critical core journeys only.
- **Supabase environments:** The test-vs-live strategy (`local` / `two-projects` / `single` / `branching`) is chosen at `/init` and recorded in `docs/PRD.md` → Constraints. Default is **`local`** — Supabase runs in Docker while you build, then migrates to a hosted live project at `/deploy` (`supabase db push`). `.env.local` always holds **test** keys, never live. Schema changes are captured as `supabase/migrations/*.sql` and promoted to production at `/deploy`.

## Build & Test Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Production server
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npm run test:all     # Both test suites
```

## Product Context

@docs/PRD.md

## Data Model

@docs/data-model.md

## Feature Overview

@features/INDEX.md
