---
name: build
description: Implement a feature end to end — database, API, and UI — with Next.js, Supabase, Tailwind, and shadcn/ui. Works through the leveled tasks.md, running file-disjoint [P] tasks as isolated sub-agents in parallel. Use after /tasks has produced the task list.
argument-hint: "PROJ-X (feature folder)"
user-invocable: true
---

# Build

## Goal
Implement one feature as a complete vertical slice: data layer (schema + API where needed), server-side logic, and UI — in one pass. Build what the spec asks for; don't invent scope.

## Does this project match what this skill assumes?

Read `mode` and `stack` from `.ai-eng-kit` before anything else. `new` means the kit scaffolded this
project and everything below applies as written. `existing` means the kit was added to a project that
already ran, and parts of this skill may describe a stack it does not have.

**Where they differ, say so and hand off — never improvise the equivalent.** A confident instruction
for the wrong stack costs more than an honest "I don't know how this project does that", because the
user cannot tell the two apart from the outside. Use `commands` for anything you run and `probe` for
anything you verify; a `null` there means unknown, and the answer is to ask, not to guess.

What this skill assumes, and what to do when the project does not match:

- **`npm run build` / `npm test`** → use `commands.build` and `commands.test`. A command recorded as `null`
  is not "skip the check", it is a question for the user.
- **shadcn/ui components under `src/components/ui/`** → only when `stack.ui` is `shadcn`. Otherwise follow the
  UI conventions already in the project, and never install a component library it did not ask for.
- **Schema as `supabase/migrations/*.sql`** → only when `stack.backend` is `supabase`. The *discipline* is
  universal and still applies: every schema change is a versioned file in whatever migration system this
  project uses, and a migration that already shipped is frozen. Find that system before writing schema.
- **Next.js Server Actions and route handlers** → only when `stack.framework` is `nextjs`. The rules they
  serve are not framework-specific: credentials never travel in a URL, and everything that checks a
  credential is rate-limited. Those are **hard gates in every stack** — implement them the way this project
  implements request handling.

## The Contract
The feature folder is the single source of truth: `spec.md` is the WHAT, `design.md` (authored by `/architecture`) is the HOW, and `tasks.md` (authored by `/tasks`) is the ordered build plan. Everything you build traces back to them via AC-IDs. `spec.md` is READ-ONLY during build — you never write to it. If reality forces a deviation from the design, you stop and flag it. You never silently redesign.

## Start by Reading
Before writing anything, read. Never assume contents from memory:
1. The feature folder the user passed — `features/PROJ-X-*/spec.md` (the contract, READ-ONLY), `features/PROJ-X-*/design.md` (the technical design), and `features/PROJ-X-*/tasks.md` (the ordered, leveled task list).
2. `features/INDEX.md` — current status, and what's already shipped so you don't duplicate it.
   - Also skim `docs/data-model.md` — the app-wide data model. Your schema/migrations implement this feature's slice of that map; reuse the agreed entities and relationships instead of inventing parallel tables. (`/architecture` already designed against it; if `design.md` and the map disagree, stop and flag it rather than guessing.)
   - And `docs/app-shell.md` — the app-wide frame. Build this feature's UI **inside** it: reuse the listed shell components and follow the recorded page pattern (header, loading, empty, error). Never add a second sidebar, header, or navigation here — the shell belongs to the feature named at the top of that file. If the design needs the shell to change, stop and flag it (that's a `/refine` on the shell's owner), don't build it into this feature.
3. The code you'd be extending: `git ls-files src/app/api/`, `ls src/components/ui/`, `ls src/components/*.tsx`, `ls src/lib/`, `ls src/app/`. Match existing patterns instead of introducing new ones.

## Work on a Feature Branch
You build on a branch, never directly on `main`, so a half-finished build can't break the live app. **Creating the branch is the user's job** — you don't create or switch branches yourself; you just make sure one exists before you start.

1. Check the current branch: `git branch --show-current`.
2. **If it's `main`** (or the shared default branch): stop and hand off — do NOT create the branch yourself:
   > "Before I build, put this feature on its own branch so your live `main` stays safe. Run: `git checkout -b feat/PROJ-X-name` — then tell me to continue. Everything I build and test lives on that branch until you deploy; if a build goes wrong, you can just throw the branch away."
   Wait for the user to create it and confirm before doing any work.
3. **If it's already a feature branch**, proceed — just note which branch you're on.

The parallel `[P]` worktrees below branch off the current feature branch and integrate back into it. The feature stays on this branch through `/qa` and `/e2e-tests`; merging into `main` happens at `/deploy`.

## Work the Task List (Level by Level)
`tasks.md` is the build plan — work it top to bottom, never ad hoc. Tasks are grouped into Levels by dependency; **Levels run sequentially** and act as barriers. "Data contract before UI" falls out of the level order: schema/API levels precede UI levels, so you build the UI against real signatures, not throwaway mocks.

Within a single level:
- For each task marked `[P]`, fan out one sub-agent **in parallel** — each with its own context window and **git-worktree isolation**, because parallel writers sharing a working tree collide.
- Non-`[P]` tasks build inline/sequentially.
- **If your agent cannot fork sub-agents or isolate worktrees, run the `[P]` tasks sequentially too.** The fan-out is an optimization; the level barriers, the disjoint file sets and the single verification owner are what the plan depends on.
- **Trust the disjointness, but verify.** `tasks.md` guarantees that `[P]` tasks within a level touch disjoint file sets. If you notice two `[P]` tasks would in fact write the same file, do NOT run them in parallel — stop and report the overlap rather than racing them.
- A forked sub-agent has its own context and won't inherit a domain skill the main agent could see. When you fork work that touches one, name it explicitly in the sub-agent's instructions ("consult the `supabase-postgres-best-practices` skill before writing schema") so the fork loads it. If a part depends heavily on its skill, keep it inline.

After each level completes, the **main agent** — not the sub-agents — integrates the results, verifies them against the AC-IDs that level's tasks claim to satisfy, and checks off those tasks in `tasks.md`. There is exactly one verification owner: sub-agents never declare themselves done. Only when a level is verified do you start the next one.

When a level holds just one or two trivial tasks, build them inline — don't fork for the sake of fan-out. Use isolation where it pays.

## Use Available Domain Skills
When a feature touches a domain that has a vetted skill installed, follow that skill instead of writing from memory — memorized API knowledge goes stale.

- Before building a domain-specific part, load the matching skill if one exists.
- In this stack: `supabase` for general Supabase work (Auth, SSR, RLS, Edge Functions), `supabase-postgres-best-practices` for query/schema performance, `stripe-best-practices` for payments.
- The domain skill governs *how* to integrate the service; the spec still governs *what* the feature does, and the non-negotiables and verification below still apply to the result.
- If a live-docs MCP (e.g. **Context7**) is connected, consult it for the *current* API surface before writing against a library — it catches API drift that a vetted skill or memory would miss. Use it to confirm signatures; the domain skill still governs the approach. Not connected → proceed; it's optional, never a blocker.
- No relevant skill installed → proceed normally; don't block.

## Does This Feature Need a Backend?
Decide before you build:
- **Backend needed** if the feature touches a database, user accounts/auth, server-side logic, API endpoints, or multi-user data sync.
- **Frontend-only** if it's localStorage, no accounts, no server communication (landing page, static tool, local-only prototype).

If frontend-only, skip everything backend below and build just the UI. Don't stand up a server for something that doesn't need one.

## Supabase Environments & Schema Files
When the feature has a Supabase backend, two things follow from the **Environment strategy** recorded in `docs/PRD.md` → Constraints (`local` / `two-projects` / `single` / `branching`). Read it before touching schema.

- **Capture every schema change as a versioned `.sql` file** in `supabase/migrations/` (e.g. `supabase/migrations/0002_add_tasks_table.sql`) — `CREATE TABLE`, RLS policies, indexes, columns. This file is the portable record of the change. Every strategy needs it: `local` applies it via `supabase db reset` and pushes it at `/deploy`, `two-projects` copy-pastes it into prod at `/deploy`, `branching` keeps it as the audit trail behind the Merge, `single` gets a clean history. Never apply schema only by clicking in Studio with no file in the repo.
- **A migration that has already gone live is frozen — never edit or delete it, always add a new one.** Production records which migrations ran (for `local`, in the remote `supabase_migrations.schema_migrations` table), so an edited file is skipped there while `supabase db reset` replays the new version locally. Local and production then differ silently, and nothing warns you. Before changing any `.sql` file, check whether it shipped: `features/INDEX.md` tells you which features are **Deployed**. If it did, correct it forward with `supabase migration new fix_<what>`. Only a migration that has never left your machine may still be edited.
- **Build against the test environment**, never live: your local `.env.local` points at the test env (local Docker instance / dev project / staging branch / the single project). You only ever apply schema to that env here — promotion to production is `/deploy`'s job, not yours.
- **For `Environment strategy: local`** (the default): the test env is a local Supabase stack in Docker, **stood up by `/init`** (and re-checkable via `/verify-setup`) — not here; getting the stack running is project setup, not a feature. If the local stack isn't running or `.env.local` lacks the local keys, stop and point the user to `/verify-setup` (repair) rather than editing live data. Author schema changes with the CLI so they land as files: `supabase migration new <name>` → write the SQL → `supabase db reset` (or `supabase migration up`) to apply locally. The migration files in `supabase/migrations/` are exactly what `/deploy` later pushes to the live database.
- **Cloud strategies** (`two-projects` / `single` / `branching`): the hosted project(s) and keys are the user's to set up; `/verify-setup` checks `.env.local` exists. If a key step is missing, hand it off in plain language and wait — don't invent infrastructure.
- **The `profiles` table, per-user RLS pattern, and signup→profile trigger are NOT setup** — they belong to the **User Accounts & Auth feature** and are built here like any other feature slice, against `docs/data-model.md`.

## Asking vs. Assuming
Apply this at *every* point in the work, not just upfront:

**Ask when an assumption is load-bearing AND the spec doesn't settle it.** Load-bearing = it touches security, the data model, data loss, or anything hard to reverse — e.g. owner-only vs. shared access, how concurrent edits resolve, whether a delete cascades, a visual direction with no design reference.

**Don't ask when the spec, PRD, or `docs/design-system.md` already answers it, or the choice is low-stakes and trivially reversible.** Take the obvious default, note it (below), keep moving — ritual questions just train the user to rubber-stamp.

Don't front-load a fixed question list. The ambiguity that hurts surfaces *during* implementation; when it does, stop there and ask rather than park it and guess.

## Surface Your Assumptions
Before you commit, list the assumptions you made that the spec didn't state, and mark the ones you're unsure about — this turns silent guesses into something the user can catch before they're buried in code.

Keep it tight:
> **Assumptions**
> - Tasks are private to their creator (spec implied it, didn't state it) — confident
> - Archive is a soft-delete, not a hard delete — ⚠️ unsure, please confirm

## Build the Slice
You decide *how* to build it. Two principles:

- **Data contract before UI.** When the feature has a backend, settle the schema and API signatures first, then build the UI against those real signatures — not throwaway mocks a later step has to rip out. The level order in `tasks.md` already enforces this; honor it.
- **shadcn/ui first for standard UI.** Check `src/components/ui/` before building any component; install missing ones with `npx shadcn@latest add <name> --yes`. Custom components only as compositions of shadcn primitives. **Apply `docs/design-system.md`** — `/init` writes it for every project, so treat it as binding rather than optional: its colors, radius, typography, and its hover/focus and light-dark rules apply to everything you build. Only ask for visual direction if the file is genuinely missing (a project that predates it).

## Keep It Minimal
The acceptance criteria define the exact functional scope — build precisely to them, then stop. Default to the simplest implementation that meets them; solve the problem in front of you, not a generalized version of it.

- No abstraction until there are two real callers — don't extract a helper, hook, or generic for a single use.
- No speculative options, config, or flags for requirements not in the spec.
- Don't hand-roll what the framework or an installed library already does.
- Don't add defensive handling for cases the spec rules out.
- Prefer code the spec's reader could follow over clever code.

This governs structure, not safeguards — it never licenses dropping a non-negotiable. RLS, input validation, auth checks, and loading/error/empty states are required no matter how simple the feature.

If the simple approach genuinely looks insufficient, that's a load-bearing assumption: surface it or ask — don't silently build the heavier version.

## What "Done" Means
These outcomes must hold, and you verify them rather than assert them. The security items are hard gates — a slice with a missing RLS policy or an unauthenticated write endpoint is not done, even if it builds.

Data & API (when the feature has a backend):
- Every new table has Row Level Security enabled, with policies covering the operations this feature actually uses.
- Every write endpoint validates its input and rejects unauthenticated and unauthorized requests.
- **Anything that checks a credential is rate-limited (hard gate).** Login, signup, password reset, invite codes, shared passwords — the throttle `design.md` specified is actually implemented and returns a 429 (or the specified refusal) once the limit is hit, and the failure message doesn't reveal whether the account exists. For custom auth routes, key the limit by **IP and account**, not IP alone. If the design relies on Supabase's own limits or CAPTCHA instead, verify that it's switched on rather than assuming it. A login that accepts unlimited guesses is not done, however well it builds.
- Performance-relevant columns are indexed; no N+1 access patterns.
- Every schema change is captured as a `.sql` file in `supabase/migrations/` and applied to the test environment (never live) — see "Supabase Environments & Schema Files".
- Integration tests exist per route, proving the code itself runs correctly — happy path plus the failure paths (rejected input, unauthenticated, wrong user). This is your own proof that the code works, not the acceptance test; `/qa` owns acceptance, and `/e2e-tests` owns end-to-end browser tests for critical journeys.
- No secrets hardcoded in source.

UI:
- Loading, error, and empty states are handled.
- Responsive across mobile (375px), tablet (768px), desktop (1440px).
- Semantic HTML and ARIA where it matters; keyboard navigable.
- **Forms with credentials or sensitive data POST — never native GET (hard gate).** A `<form>` left to submit natively sends every field in the URL (`?email=…&password=…`), leaking them into browser history, server logs, and referrer headers. Either use a Next.js **Server Action** (`<button formAction={action}>` with a `'use server'` handler — POSTs by design) or, in a client component, an `onSubmit` that calls `e.preventDefault()` before doing the call. Never put credentials, tokens, or PII in a URL/query string.
- **Supabase auth uses the `@supabase/ssr` Server Action pattern**: a `'use server'` `login`/`signup` action reading `formData`, calling `supabase.auth.signInWithPassword`/`signUp`, then `redirect()`. Don't hand-roll a client login form that risks native submission. (Consult the `supabase` skill or Context7 for the current shape.)

Whole slice:
- `npm run build` and `npm test` pass.
- The UI talks to the real endpoints — no leftover mock data.
- Every acceptance criterion is addressed in the implementation. `/qa` independently verifies them — that check is its job, not a box you tick here.

Run the checks. "Should pass" is not "passes."

For deeper setup when a feature needs it: `docs/production/database-optimization.md`, `docs/production/rate-limiting.md`. Load only when relevant.

## Context Recovery
If your context was compacted mid-task, don't restart from zero:
1. Re-read the feature folder (`spec.md`, `design.md`, `tasks.md`) and `features/INDEX.md`.
2. Check `tasks.md` for which tasks are already checked off; `git diff`, `git ls-files src/app/api/`, `git ls-files src/components/` to see what already exists.
3. Continue from the first unchecked task in the current level. Don't duplicate work.

## When You're Done
- Every task in `tasks.md` is checked off. Don't write implementation notes into `spec.md` — it's read-only; put any short notes at the end of `design.md` or in the commit message.
- Set the feature's status in `features/INDEX.md` (it's "In Progress" while you build).
- Report back: what you built, the assumptions you surfaced, and the verification results.
- Hand off: "Feature is built. Next: run `/qa` to test against the acceptance criteria."

## Git Commit
```
feat(PROJ-X): Implement [feature name]
```
