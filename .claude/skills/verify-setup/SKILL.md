---
name: verify-setup
description: Verify and complete the project setup after install. Checks the framework for every agent the project uses, plus the stack it actually has — the kit's own (dependencies, Supabase, shadcn/ui, tests) or, in a project the kit was added to, the one recorded in .ai-eng-kit. Auto-fixes what is safe, reports in plain language what is left. Run after install and any time setup looks off.
user-invocable: true
---

# Verify Setup

## Goal
Confirm the project is correctly wired and finish anything that's missing, so the user is ready to run `/init`. The audience is non-technical (PMs/founders) — speak in plain language, never dev jargon, and never dump raw error output at them.

## When to run
- Automatically at the end of `npx create-ai-eng-app` / `add`.
- Any time the setup looks off, or after the user completed a hand-off step (e.g. pasted their Supabase keys). It is safe to re-run as often as needed.

## Guiding principle
**Auto-fix what is safe and deterministic. Only hand off what genuinely needs a human** (credentials, account actions). For each check: detect → fix silently if safe → otherwise give the user exactly one clear instruction and point them to the matching lesson.

## Step 0 — What kind of project is this
Read `.ai-eng-kit` before anything else. Two keys decide what the rest of this skill may assert:

- **`mode`** — `new` means the kit scaffolded this project, so the stack below is ours and must be there. `existing` means the kit was *added* to a project that was already running: **its** code, dependencies and tooling are the source of truth, and a check that asserts the kit's own stack simply does not apply. A missing key means the project predates the question — treat it as `new`.
- **`stack` / `commands` / `probe`** — what this project actually is, how to start it, and how to check a claim against it. In `existing` mode these are the only stack facts you may rely on. A `null` means *not known yet*, never *not there*: ask or hand off to `/init`, never assume the kit's default.

Checks marked **(scaffold only)** are skipped in `existing` mode. Report them as "not applicable — this project brings its own" rather than dropping them silently, so the user sees the check was considered and not forgotten.

**Never repair an `existing` project by installing the kit's stack into it.** No `npx shadcn init`, no Supabase scaffolding, no adding test tooling it did not ask for. If something the kit needs is genuinely missing, that is a hand-off with one clear sentence, not a fix.

## Checks
Run these in order. For each, report ✅ (fine), 🔧 (you fixed it), or ⚠️ (needs the user).

1. **Toolchain** — Node and npm available and a sane version.
2. **Dependencies** — present is not the same as complete: a partial install is the failure that looks fine here and breaks two steps later, in a place nobody connects back to setup.
   - **`new`:** `node_modules` must exist and be complete. Run `npm ls --depth=0` — it exits non-zero and names anything `package.json` declares that is missing or mismatched. If it reports missing packages, or the folder is absent, run `npm install` and check again. If the install itself fails, that is ⚠️ and the single next action for the user; never report green over it.
   - **`existing`:** the dependencies belong to the project, not to the kit — we never installed them and must not install them now. If `.ai-eng-kit` → `commands.dev` is set, run the equivalent listing for that package manager (`npm ls --depth=0`, `pnpm ls --depth 0`, `yarn list --depth 0`, `bun pm ls`) and report what it says as **information, not a gate**: the user may be working in a repo that is intentionally half-installed. If there is no `package.json` at all, say so neutrally and move on — plenty of projects are not Node projects.
3. **Framework files** — the framework itself, for **every** coding agent this project is installed for. Read `agents` from `.ai-eng-kit`; if the file or the key is missing, treat it as `["claude"]`. Each agent reads the framework from its own place:

<!-- emit:verbatim -->
   | agent | skills | rules | memory file |
   |---|---|---|---|
   | `claude` | `.claude/skills/` | `.claude/rules/` | `CLAUDE.md` |
   | `codex` | `.codex/skills/` | *(inside the memory file)* | `AGENTS.md` |
   | `cursor` | `.cursor/skills/` | `.cursor/rules/*.mdc` | `AGENTS.md` |
   | `copilot` | `.github/skills/` | `.github/instructions/*.instructions.md` | `.github/copilot-instructions.md` |
   | `antigravity` | `.agents/skills/` | `.agents/rules/` | `AGENTS.md` |
<!-- /emit:verbatim -->

   **Exactly one of those memory files carries content — the canonical one.** `.ai-eng-kit` → `memory`
   names it (`CLAUDE.md` in a Claude-Code-only project, otherwise `AGENTS.md`). Every other memory file
   holds nothing but a managed block pointing at it. That is deliberate: one file to edit, no drift.
   If a file that should be a pointer has grown its own content, do not delete it — report it and tell
   the user to move what matters into the canonical file.

   Check **every** listed agent, not only the one you happen to be running in. You cannot tell reliably which that is, and the whole point of this check is to catch the layout that broke silently — after a `git pull`, a merge, or a half-finished install.

   Expect 16 skills per agent. If a folder is missing or short, that is ⚠️ and you **do not repair it by hand** — these files are generated, and hand-written copies drift. The repair is one command, run from the project folder:
   `npx create-ai-eng-app@VERSION update --agents=IDS`
   Substitute `VERSION` with `version` from `.ai-eng-kit` and `IDS` with its `agents`, comma separated. Pin the version so a repair restores what this project has instead of quietly upgrading it mid-build; pass `--agents` so the command does not stop to ask. Re-run the check afterwards.
<!-- emit:verbatim -->
3b. **Guardrails — Claude Code only, and say so.** `.claude/settings.json` is what actually *blocks* reading `.env*` files and force-pushing; it is a Claude Code file and the kit ships no equivalent for the others. If `claude` is among the agents, check the file is present. For every other agent the same rules exist only as instructions in the project rules — followed, not enforced. When the project has non-Claude agents, state this plainly in the report. Never let the user believe a gate exists where there is only a request.
<!-- /emit:verbatim -->
3c. **Project documents** — `docs/PRD.md` and `features/INDEX.md`. Report **one** status per file, not two that appear to disagree:
   - **Missing** → ⚠️. The installer creates both, so an absent file means one was deleted or a `git` operation lost it. Repair with the pinned `update` command from check 3.
   - **Present but still the starter template** → ➖, and say so in the same breath as the `/init` hand-off below — never as a separate complaint. Before `/init` this is the **correct** state, not a fault. Detect it: `docs/PRD.md` still carries the italic placeholder under *Vision*, and `features/INDEX.md`'s feature table has no rows.
   - **Filled** → ✅.

   Reporting "✅ present" and then "⚠️ still empty" for the same file reads as two findings that contradict each other. One file, one line, one status.

3d. **Feature layout** — if `features/` holds `PROJ-*.md` files **directly** (not `features/PROJ-*/spec.md` folders), this project's documentation is still in the AI Coding Starter Kit's one-file-per-feature shape. That is ⚠️ with one action: "Run `/starter-kit-migration` — it splits each feature file into spec, design and QA report and gives the acceptance criteria stable IDs." Until then `/write-spec`, `/tasks` and `/qa` have nothing they can navigate: `spec.md` has to be read-only during `/build`, which is impossible while the same file also holds the QA report. Do **not** convert anything yourself here.
4. **UI library (scaffold only)** — shadcn/ui initialized (`components.json` exists). If not, run `npx shadcn@latest init` with project defaults. In `existing` mode this check is `stack.ui`'s business: report what is recorded there and move on. Never initialize a UI library in someone's running project.
5. **Test tooling** —
   - **`new`:** vitest and playwright are configured and the `test` and `test:e2e` scripts exist in `package.json`. Do **not** install Playwright browsers here — that ~300 MB download is deferred to `/e2e-tests`, which is the only step that needs a real browser. Keeping it out of setup keeps the install fast.
   - **`existing`:** check that what `.ai-eng-kit` records is *true*, not that it matches the kit. For every non-null entry in `commands`, confirm the script it names really exists (in `package.json` → `scripts`, or as the documented entry point). A command recorded but missing is ⚠️ — every skill downstream will run it. A `null` is not a failure: it is the open question `/init` answers.
5b. **How this project runs (existing only)** — `platform`, `commands.dev` and `probe.kind` in `.ai-eng-kit` must be filled. They decide whether `/qa` can verify a claim against the running app or only read code, so an empty `probe.kind` is not cosmetic. If any is `null`, that is ⚠️ with exactly one action: "Run `/init` — it records how this project runs before planning anything." Do **not** fill them in yourself from what the repo looks like; guessing here is how every later skill inherits a wrong assumption.
6. **Environment (scaffold only — and in `existing` mode only when `stack.backend` is `supabase`)** — an existing project manages its own secrets, in its own files, and the kit has no business asserting a filename it never created. Where it does apply: check only whether `.env.local` **exists**. **Never read, `cat`, `grep`, or print the contents of `.env.local`, `.env.local.example`, or any env file** — the user's secrets must stay private, and their permissions may (rightly) block reading these files. If `.env.local` is **missing** → ⚠️ hand off: tell the user to create it from `.env.local.example` and add their Supabase keys (the "Connect Supabase" lesson shows where to find them). If it **exists**, simply remind the user to make sure their keys are filled in — do **not** verify the values yourself. Always include the safety reminder that `.env.local` should hold their **test** keys (local Docker instance / dev project / staging branch / their single project), never live-production keys — local `npm run dev` must not run against real user data. (Which environment that is gets decided in `/init`; if no env strategy is set in `docs/PRD.md` yet, just give the general reminder.)
6b. **Local Supabase setup (scaffold only; in `existing` mode skip unless `stack.backend` is `supabase` — and even then never stand a stack up in a running project without asking) — and only if `Environment strategy: local` in `docs/PRD.md`** — `/init` already stands the local stack up when it chooses `local`, so here this is an **idempotent re-check / repair**: confirm it's in place and finish anything missing (e.g. the user reset Docker, switched machines, or changed strategy). If `docs/PRD.md` has no strategy yet (still the starter template), say so **neutrally and move on** — do NOT tell the user to come back later; `/init` will handle Supabase setup itself. When the strategy is `local`, work top to bottom; hand off only what needs a human:
   - **Docker running** — `docker info` succeeds. If Docker isn't installed or isn't running → ⚠️ hand off: "Local Supabase runs inside Docker. Install **Docker Desktop** and start it, then run `/verify-setup` again." Don't try to install it.
   - **Supabase CLI available** — `supabase --version` works (or `npx supabase --version`). If missing → ⚠️ hand off the install command for their OS (e.g. `brew install supabase/tap/supabase`), or note it can run via `npx supabase`.
   - **Project initialized** — if there's no `supabase/config.toml`, run `supabase init` (safe, just writes config).
   - **Stack running** — if the local stack isn't up, run `supabase start`. Warn the user first that the **first run downloads ~GB of Docker images and can take a few minutes**. When it finishes, it prints the local API URL and anon key.
   - **Clients wired** — make sure the Supabase client code in `src/lib/supabase.ts` is active (uncommented) so features can import it.
   - **Local keys in `.env.local`** — remind the user to paste the local API URL + anon key that `supabase start` printed into `.env.local` (you don't read the file; you just tell them which values go where). These are local-only, safe.
   - Skip this whole check for any other env strategy (`two-projects` / `single` / `branching`) — they're cloud-only, no Docker, no local stack.
6c. **Working language** — the **canonical** memory file (check 3) → Key Conventions must carry a `**Working language:` line with a real language (not the raw `{{WORKING_LANGUAGE}}` placeholder). It is set by the scaffolder, so a missing line means the project predates the question. Then ⚠️ ask the user once — "In which language should I work with you — **Deutsch** or **English**? It covers both our conversation and every document I write for you." — and add exactly that one line under Key Conventions, with `<Language>` filled in all three times:
   `- **Working language: <Language>.** Talk to the user in <Language> and write every project document in <Language> — see \`.claude/rules/general.md\` → Working Language.`
   It belongs in the canonical file only — the pointer files carry no content of their own.
   From that moment on, **switch to that language for the rest of this run**, including the setup report below.
   This is the **only** edit outside the managed markers you are allowed to make, and only when the line is absent — never rewrite an existing one, and never mass-translate documents that already exist (see `.claude/rules/general.md` → Working Language). Also record it in `.ai-eng-kit` as `"language": "de"|"en"` if that key is missing.
7. **Managed block** — every memory file from check 3 must carry the block between `<!-- AI-ENG-KIT:START -->` and `<!-- AI-ENG-KIT:END -->`, and never touch anything outside those markers (that is the user's project context).
   The block is **not identical across memory files**: the canonical file's block carries the workflow map, and where an agent cannot read a rules directory the rule bodies are pasted in as well; a pointer file's block only sends the agent to the canonical file. So never copy one memory file's block into another. If a block is missing or stale, repair it with the same pinned `update` command as check 3, which regenerates each memory file in its own shape. Hand-splicing is a last resort, and it is only ever correct for Claude Code:
<!-- emit:verbatim -->
   > Claude Code alone keeps the block exactly as shipped: `CLAUDE.md` takes the content of
   > `.claude/skills/verify-setup/managed-block.md` verbatim. The `managed-block.md` copy inside any
   > other agent's skills folder is a reference artifact, **not** that agent's block — its memory file
   > is generated. Never paste it.
<!-- /emit:verbatim -->
8. **Git** — repository initialized.

## Output
A plain-language summary the user can act on, **written in the project's working language** (`CLAUDE.md` → Key Conventions) — the example below shows the shape, not the language:

```
🔎 AI Engineering Kit — Setup check (v<version>)

✅ Project scaffold (Next.js, TypeScript, Tailwind)
✅ UI library (shadcn/ui)
✅ Test tooling (Vitest + Playwright configured; browser installs on first /e2e-tests)
✅ Framework files & workflow map up to date (Claude Code, Codex)

⚠️ One thing I need from you:
   I check whether .env.local exists, but I never read it — your secrets stay private.
   → Make sure .env.local exists and has your Supabase keys
     (SUPABASE_URL, SUPABASE_ANON_KEY). Use your TEST keys here, never your
     live ones — local dev must not touch real data. The "Connect Supabase"
     lesson shows where to find them.
   Then run /verify-setup again.

Status: almost ready — 1 open item.
```

In `existing` mode the report says what the *project* has, never what the kit would have brought — and names what was skipped, so nothing looks forgotten. Note that the closing line sends the user **onward**, not back:

```
🔎 AI Engineering Kit — Setup check (v<version>)

✅ Framework files & workflow map up to date (Claude Code, Codex)
✅ Your stack: Vite + Supabase, tests with Vitest, pnpm
✅ Recorded commands all exist (pnpm dev, pnpm build, pnpm test)
➖ UI library, Supabase environment — not applicable, this project brings its own
➖ PRD and feature index are still the starter templates — /init fills them

⚠️ One thing I need from you:
   I don't yet know how to check a claim against this app while it runs.
   → Run /init — it records how this project runs, and fills the two documents above.

Status: almost ready — 1 open item.
```

One open item, one next action. The starter templates are named where they are explained, not raised a second time as if they were a separate problem.

## The gate
- All green → end with: "You're ready. Run `/init` to define your product and feature map."
- Open hand-offs → end with the single next action and "then run `/verify-setup` again."
- **Exception: when the open item is `/init` itself, do not send them back here.** `/init` is the next step in the workflow, not a repair — it hands off to `/write-spec` when it is done, and a round trip through `/verify-setup` would only confirm what `/init` just wrote. End with `/init` and nothing after it. The same holds for any other skill in the chain: "run `/verify-setup` again" belongs to things *you* could not fix and the **user** must do — credentials, an account action, an install — never to a workflow step.

## Optional tip (never a gate)
Once everything is green, you may add a one-line, **optional** suggestion — never as an open item, never blocking:
> 💡 Optional, for sharper results: connect the **Context7** MCP server in your agent's MCP settings. It gives `/architecture` and `/build` the current API docs for libraries (Supabase, Stripe, …), so they code against today's API, not yesterday's. The kit works fully without it.

Skip this tip if any hard gate is still open — don't distract from the real next action.

## Important
- Idempotent and re-runnable — running it twice must never break anything.
- **Never read, inspect, or print the contents of any env file** (`.env.local`, `.env.local.example`, …) — only check that it exists. Secrets stay private and reading them may be blocked by the user's permissions. Never overwrite `.env.local`.
- Only ever edit a memory file between the managed markers — with the single exception in check 6c (adding a missing Working language line).
- Check every agent in `.ai-eng-kit`, never guess which one you are. Repair generated layouts with the pinned `update` command, never by hand.
- **In `existing` mode, never install, initialize or scaffold anything the project did not already have.** The kit was added to their work, not the other way round. Everything missing is a hand-off; nothing is a fix.
- **Never write `platform`, `stack`, `commands` or `probe` yourself.** They are `/init`'s to record, from what the user confirms — not from what the repo looks like to you. A wrong value there is inherited silently by `/build`, `/qa` and `/deploy`.
- Distinguish hard gates (dependencies, env keys, framework files) from nice-to-haves — don't block on the latter.
