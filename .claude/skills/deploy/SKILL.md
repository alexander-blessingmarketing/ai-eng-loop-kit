---
name: deploy
description: Deploy to your host (Vercel or Hostinger) with production-ready checks, error tracking, and security headers setup. Pass a feature (e.g. PROJ-2) to ship just that one, or run it with no argument to launch all ready features together as one release.
argument-hint: "optional: feature to deploy (e.g. PROJ-2) — omit to launch all ready features"
user-invocable: true
---

# DevOps Engineer

## Goal
Get features to production safely — environment setup, pre-deploy readiness checks, error tracking, and security headers — and don't ship until production is actually wired. A broken deploy hurts users more than a delayed one. Works for shipping **one** feature or **launching all ready features together** as a single release.

## Does this project match what this skill assumes?

Read `mode` and `stack` from `.ai-eng-kit` before anything else. `new` means the kit scaffolded this
project and everything below applies as written. `existing` means the kit was added to a project that
already ran, and parts of this skill may describe a stack it does not have.

**Where they differ, say so and hand off — never improvise the equivalent.** A confident instruction
for the wrong stack costs more than an honest "I don't know how this project does that", because the
user cannot tell the two apart from the outside. Use `commands` for anything you run and `probe` for
anything you verify; a `null` there means unknown, and the answer is to ask, not to guess.

This is the skill that diverges most, so check before you read any further:

- **`stack.deploy` is not `vercel`** → the hosting steps below do not apply. Ask how this project goes live
  and follow *that* path. Do not translate the Vercel steps into a guess about their platform.
- **`stack.backend` is not `supabase`** → **skip "Promote the Database" entirely.** `supabase db push`,
  `supabase link`, the migration ledger — none of it exists here. What survives is the principle: the
  production database must carry the schema you built and tested, promoted deliberately and never by
  clicking around. Ask how they promote schema and follow it.
- **A human-gated release** (app store review, a change window, an approval) → treat the wait as part of the
  process and hand it off. Never report a release as done while it is queued for someone else's approval.
- **Nothing recorded about deployment at all** → stop here. Tell the user you do not know how this project
  goes live and ask. This is the one skill where improvising touches production.

What applies in **every** project: the pre-flight checks pass before anything ships, `features/INDEX.md` is
the single record of what went live, and writing to real data is confirmed by the user first — every time.

## Resolve the Scope (single feature vs. launch all)
Before anything else, decide **what** is being deployed. Never silently mass-deploy.

- **Argument given (`/deploy PROJ-X`)** → the **launch set** is exactly that one feature. Proceed.
- **No argument (`/deploy`)** → read `features/INDEX.md` and find every feature with status **Approved** (passed `/qa`, no Critical/High bugs) that isn't already **Deployed**. Then use the **AskUserQuestion tool** — never decide for the user:
  - **0 ready** → tell them nothing is ready to deploy (what's still in progress / needs `/qa`), and stop.
  - **exactly 1 ready** → confirm: "Deploy **PROJ-X – [name]** to production?"
  - **2+ ready** → offer: "**Launch all N together** as one release (PROJ-A, PROJ-B, …), or **pick one**?" If they pick one, the set is that single feature.
- If the user names features that are **not** Approved (still In Progress/In Review, or with open Critical/High bugs), **stop and list them** — let them choose: fix those first, or launch only the Approved subset. Never launch an unverified feature.

Everything below operates on **the launch set** — one or many. Where a step says "the feature," apply it to every feature in the set. The differences for a multi-feature launch are called out inline (one combined DB promotion, merge every branch, **one** release tag).

## Before Starting
1. Read `features/INDEX.md` to know what is being deployed (the launch set from "Resolve the Scope")
2. For **every** feature in the launch set, check QA status in its `features/PROJ-X-*/qa-report.md`
3. Verify no Critical/High bugs exist in any of those QA results
4. If a feature in the set hasn't been through QA, tell the user: "Run `/qa` on PROJ-X first before deploying" — and drop it from the set or stop, per their choice
5. Read the **Environment strategy** from `docs/PRD.md` → Constraints (`local` / `two-projects` / `single` / `branching`). It changes how the database goes live — see "Promote the Database" below. (No Supabase backend → skip all database steps.)
6. Read the **Hosting** platform from `docs/PRD.md` → Constraints (`Hosting: vercel` or `Hosting: hostinger`). If it isn't recorded yet, you'll pick it in Step 2 and write it there so future deploys remember.

## Workflow

### 1. Pre-Deployment Checks
- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` passes
- [ ] QA Engineer has approved the feature (check `features/PROJ-X-*/qa-report.md`)
- [ ] No Critical/High bugs in test report
- [ ] All environment variables documented in `.env.local.example`
- [ ] No secrets committed to git
- [ ] Test-environment schema is up to date and captured in `supabase/migrations/*.sql` (production promotion happens in Step 2b)
- [ ] No already-pushed migration file was edited after the fact — `git log -- supabase/migrations/` shows changes to migrations that went live in an earlier release only if something went wrong. A pushed migration is frozen; corrections are new files (see Step 2b)
- [ ] All code committed and pushed to remote

### 2. Hosting Setup (first deployment only)
Both supported hosts work the same way: you connect your GitHub repo once, and the host builds and deploys automatically on every push to `main`.

**Which host?** Read `docs/PRD.md` → Constraints for a `Hosting:` line (`vercel` or `hostinger`). If it's missing, ask the user which they use, then record it there (e.g. `Hosting: hostinger`) so future deploys don't have to ask again.

**Common to both — guide the user through:**
- [ ] Connect the GitHub repository so pushes to `main` trigger an automatic build + deploy.
- [ ] Framework: **Next.js** (Vercel auto-detects it; on Hostinger choose the Next.js / Node.js app type).
- [ ] Add the environment variables from `.env.local.example` in the host's panel — but use the **PRODUCTION** Supabase keys here, not the test keys from `.env.local` (see the Environment strategy below for which project/branch those are). Client-side vars need the `NEXT_PUBLIC_` prefix.
- [ ] Set a domain (or use the host's default subdomain).

**Vercel specifics:**
- Create the project with `npx vercel`, or at vercel.com → "Import" the GitHub repo.
- Env vars live under Project → Settings → Environment Variables.
- Default domain is `*.vercel.app`.

**Hostinger specifics:**
- In hPanel, create the app and connect your GitHub account/repo for automatic Git-based deployment (build + publish on push).
- ⚠️ **Make sure it runs as a Node.js app** — the host must run `next build` then `next start`, not serve a static export. A Next.js app with API routes, auth, or server rendering (i.e. anything with a Supabase backend) needs a Node runtime; static-only hosting will break those features.
- Set the same environment variables in Hostinger's panel, and **redeploy after changing them** (they don't apply retroactively).
- Exact menu names live in Hostinger's panel — follow its "connect repository" and "environment variables" sections.

### 2b. Promote the Database
The code is going live, so the production database must carry the same schema you built and tested. **How** depends on the Environment strategy in `docs/PRD.md` → Constraints. Skip this step entirely if no feature in the set has a Supabase backend.

> **Launching multiple features:** promote the database **once for the whole set**, not per feature. `supabase db push` applies *all* pending migrations in order; for `two-projects` paste the full set of not-yet-applied SQL; for `branching` give **one combined plain-language diff** covering every feature's schema change before the single Merge. One promotion, covering every migration the launch set introduced.

**`local` — local Supabase (Docker) → hosted production:**
Development ran against a local Supabase stack; production is a **hosted** Supabase project that the schema is now migrated into. This is the "migrate to live" step. Two of these steps are **interactive and belong to the user** — they open a browser or prompt for a password, and you cannot answer those prompts. Hand them off and wait; don't run them and leave the user staring at a hanging terminal.

*First deploy only — the user does these, you wait:*
- [ ] Create the hosted project at supabase.com (free tier is fine). For an EU audience pick **`eu-central-1` (Frankfurt)** — the region **cannot be changed later**.
- [ ] 👤 `supabase login` — opens the browser for authentication. Without it, `link` fails.
- [ ] 👤 `supabase link --project-ref <ref>` — the ref is in the project's dashboard URL. **This asks for the database password** (the one set when the project was created). Tell them that up front so the prompt isn't a surprise; if they've lost it, it can be reset in the dashboard under Settings → Database.

*Then you take over:*
- [ ] `supabase migration list` — shows local migrations against what production has already applied. This is your inventory: everything with no remote entry is about to run.
- [ ] `supabase db push --dry-run` — prints exactly which migrations *would* be applied, without touching anything.
- [ ] **Translate the dry-run into plain language and get an explicit go-ahead.** The dry-run names files; the user needs to know what they *do* ("adds a `tasks` table with an owner-only access policy; nothing existing is deleted"). Flag anything destructive — dropped columns/tables, type changes, backfills. Both halves are required: the dry-run is the evidence, the plain-language summary is what the user actually consents to.
- [ ] `supabase db push` — applies the pending migrations, in order. This writes to real data. Ask the user first and wait for a clear yes — that confirmation is the last stop before production is touched, not a formality. Some agents also gate the command themselves; never rely on that gate being configured.
- [ ] `supabase migration list` again — every local migration should now show a remote timestamp. That is the confirmation, not a hunch.

Production keys for the host's panel come from the **hosted** project (Settings → API), not the local instance.

**Migrations already applied — why `db push` won't run things twice:**
Supabase records every applied migration in a table on the **remote** database, `supabase_migrations.schema_migrations`. `db push` compares your local `supabase/migrations/*.sql` against that table and runs only what is missing, in timestamp order. So re-running `/deploy`, or deploying a second feature later, never re-executes an earlier migration. Git tracks the *files*; the database tracks which of them *ran* — two different ledgers, and only the second one decides.

That guarantee holds on one condition, and it is the one thing to get right:

> ⚠️ **A migration that has been pushed is frozen. Never edit it — write a new one.**
> Production has its timestamp on record, so `db push` will skip the file no matter what is now inside it. Locally, `supabase db reset` replays the *edited* version. From then on local and production are silently different, and nothing warns you. If a pushed migration was wrong, fix it forward: `supabase migration new fix_<what>` with the corrective SQL.

If `migration list` shows local and remote genuinely out of sync — usually because someone clicked schema changes directly in the production Studio, or a migration was applied by hand:
- Schema exists on production but is in no local file → `supabase db pull` writes it into a migration file so the repo matches reality again.
- The *tracking table* is wrong (the SQL ran, but isn't recorded, or vice versa) → `supabase migration repair --status applied <timestamp>` / `--status reverted <timestamp>`. This only corrects the ledger; it executes and reverts nothing.
- **Never "fix" a mismatch by pushing harder.** Show the user the `migration list` output, explain in plain language which side has what, and agree on the fix before running either command.

**`single` — one project (test == live):**
- There is no separate promotion: the project you developed against *is* production. Just confirm every `.sql` file in `supabase/migrations/` has been applied to it.
- ⚠️ Remind the user this is live data — there is no safety net here. (They can switch to `two-projects` or `branching` later for one.)

**`two-projects` — dev + prod:**
- The schema lives in `supabase/migrations/*.sql`, already applied to the **dev** project. Now apply it to **prod**.
- ⚠️ **Nothing tracks what prod already has.** Pasting SQL into the SQL Editor leaves no migration ledger, so the CLI's "runs each migration exactly once" guarantee does **not** apply here — that safety net is yours to hold. Work out the boundary before you hand anything over: read `features/INDEX.md` for the last deployed feature and its date, list the migration files newer than that, and **show the user that list for confirmation** ("prod should already have 0001–0003; I'd hand you 0004 and 0005 — correct?"). If they're unsure, have them check the actual tables in the prod dashboard rather than guessing.
- Re-running a migration is not harmless: `CREATE TABLE` fails loudly (annoying but safe), while an `INSERT` or a backfill silently duplicates rows. Never say "just run it again to be sure."
- Hand off in plain language: "Open your **prod** Supabase project → SQL Editor → paste and run this SQL." Give them the exact SQL (the migration files not yet applied to prod, in order), and say plainly what it does before they run it.
- Tell them the production keys to put in the host's panel come from the **prod** project (Settings → API).
- Record in `features/INDEX.md` which migrations went live with this release — that record is the only thing the next `/deploy` can rely on.

**`branching` — Pro project, staging → production by Merge:**
- Production is promoted with the Supabase **Merge**, not by hand. But before they click it, **preview the change in plain language** so nobody merges blind:
  1. Read the `supabase/migrations/*.sql` that aren't yet in production and summarize, in plain words, exactly what will change on the live database (e.g. "adds a `tasks` table with 4 columns and an owner-only access policy; no existing data is deleted").
  2. Explicitly flag anything destructive or surprising — dropped columns/tables, data backfills, and the known Supabase branching caveat that **database functions get overwritten on merge**. If you can't rule a risk out, say so.
  3. Only after the user confirms, have them open the Supabase dashboard → the staging branch → **Merge** to production, and review the diff Supabase shows there too.
- Production keys for the host's panel come from the **production** branch (not the staging branch).

After promotion, confirm production has the expected tables/policies before moving on — for `local` that is the second `supabase migration list`, for the other strategies a look at the tables in the production dashboard. Don't move on with "it probably worked."

### 3. Merge to `main` & Deploy
Each feature was built and tested on its own branch (`feat/PROJ-X-name`). Merging into `main` is the **go-live moment** — your host auto-deploys whatever lands on `main`. You perform the merge(s), but only after the user confirms. **Push `main` only once, after all branches in the set are merged**, so the launch is a single build.

#### First: take stock of every branch
Do this **before** merging anything. The user has been branching per feature since `/build`, so branches accumulate — and a branch nobody looked at is the one place where finished-looking work quietly isn't live. List them and match each against `features/INDEX.md`:

```bash
git branch --list 'feat/*'                  # local feature branches
git branch -r --list 'origin/feat/*'        # and on the remote
git branch --no-merged main --list 'feat/*' # the ones carrying unmerged work
```

Classify every branch you find:

| Branch | INDEX says | What it means | What to do |
|---|---|---|---|
| unmerged | in the launch set | normal — this is what you're about to ship | merge it (below) |
| unmerged | In Progress / In Review / Approved | probably live work — but say so and ask | **list it and ask** |
| **unmerged** | **Deployed** | ⚠️ the feature counts as live but this branch never reached `main` | **stop and ask** |
| merged | Deployed | done and shipped | offer to delete it (Step 6) |
| merged | not yet Deployed | odd — reached `main` outside `/deploy` | flag it, check INDEX is right |
| any | no matching PROJ-X | leftover experiment or abandoned work | ask what it is |

**Show the user every open branch and ask — do not decide silently.** INDEX tells you what a feature's status is, not whether the user is at this moment working in that branch. A feature can sit at "Approved" while they are already building the next thing on top of it. Guessing here costs someone their unfinished work, so lay it out and let them answer:

> "Besides what we're shipping, these branches are still open:
> - `feat/PROJ-4-notifications` — PROJ-4 is In Progress, 12 commits. Still working on it?
> - `feat/PROJ-6-export` — PROJ-6 is Approved but not deployed, 3 commits. Ship it with this release, or leave it?
> - `feat/spike-charts` — no feature in INDEX matches this. What is it?
>
> Anything you're still using stays exactly as it is — I won't merge or delete it."

The default for every open branch is **keep it untouched**. Only a branch the user explicitly releases may be merged or deleted, and only in the steps below. Silence is not permission: if the user doesn't answer about a branch, it stays.

The bolded row is the one that needs a real answer. A feature marked **Deployed** with unmerged commits means one of two things, and only the user knows which:

> "`feat/PROJ-3-comments` still has 4 commits that never made it into `main`, but PROJ-3 is marked as deployed. Either something didn't actually go live back then, or this branch is abandoned work you decided against. Which is it? I won't merge it without you telling me."

Never merge such a branch on your own initiative — it may contain work that was deliberately dropped. Never delete it either.

If nothing is open beyond the launch set, say so in one line and move on.

1. Confirm readiness: every feature in the set passed QA (no Critical/High) and the database was promoted (Step 2b). If not, stop.
2. **Explain in plain language and get an explicit go-ahead** — this is the irreversible "it's live" step:
   > Single: "Merging `feat/PROJ-X-name` into `main` puts this feature live. Shall I go ahead?"
   > Multiple: "Merging all N branches into `main` and pushing once launches PROJ-A, PROJ-B, … together. Shall I go ahead?"
3. After the user confirms, merge **every** branch in the set into `main`, then push once:
   ```bash
   git checkout main
   git merge feat/PROJ-A-name        # repeat for each feature in the set
   git merge feat/PROJ-B-name
   git push origin main              # one push → host builds and deploys the whole app
   ```
   - If any merge reports **conflicts**, do NOT force it — stop, explain in plain language, resolve with the user, then continue with the remaining branches.
   - For features built directly on `main` (no branch), there's nothing to merge.
   - `git push` is confirmed with the user every single time. That confirmation is a second, independent gate next to the go-ahead in step 2, not a formality to click away — never work around it, and never assume your agent's own approval settings will stop you.
4. Vercel only, optional manual deploy instead of push: `npx vercel --prod`
5. Watch the build in your host's dashboard until it goes green.

### 4. Post-Deployment Verification
You have **no browser**. Everything below is split by who can actually establish it — never tick a box in the second group yourself, and never report "verified" for something you asked the user about but got no answer to.

**What you verify yourself, over HTTP against the production URL:**
- [ ] The site responds: `curl -sSI https://<url>` → 200, and HTTPS (an http:// request redirects to https://)
- [ ] The deployed pages render server-side: fetch each new route and confirm the expected content is in the HTML, not an error page or an empty shell
- [ ] API routes answer: call each route the launch set added and check the status and JSON shape
- [ ] Protected routes actually protect: request them **without** a session and confirm a redirect to login or a 401 — a 200 here is a Critical finding, stop the release
- [ ] The database is reachable: a route that reads data returns data rather than a 500
- [ ] No obvious server error: no 500s across the routes you exercised

**What only the user can confirm** — ask for these explicitly, in plain language, and wait:
> "I've checked from the outside: the site is up, the pages render, the API answers and the protected routes stay protected. Three things I can't see from here — could you look?
> 1. Open the app and log in once. Does the whole flow work end to end?
> 2. Click through the new feature the way a user would.
> 3. Open your host's dashboard and check the deploy and runtime logs for errors."

Record their answer. If the user doesn't check, that is fine — but write it down as **not verified** rather than assuming it works. Anything they report as broken goes into the rollback decision below, not into a "we'll fix it later" note.

> Want the login flow checked automatically next time? That is what `/e2e-tests` is for. Run it against a staging URL rather than production, though — a real browser test creates real accounts and real data.

### 5. Production-Ready Essentials

For first deployment, guide the user through these setup guides:

**Error Tracking (5 min):** See [error-tracking.md](../../../docs/production/error-tracking.md)
**Security Headers (copy-paste):** See [security-headers.md](../../../docs/production/security-headers.md)
**Performance Check:** See [performance.md](../../../docs/production/performance.md)
**Database Optimization:** See [database-optimization.md](../../../docs/production/database-optimization.md)
**Rate Limiting — required if the app has a login, optional otherwise:** See [rate-limiting.md](../../../docs/production/rate-limiting.md). If users can log in, confirm before going live that failed attempts are actually throttled and that CAPTCHA is on for public signup — a live login with unlimited guesses is the cheapest way in that exists. Supabase's per-IP limits are the floor, not the answer.

**Before going live with personal data**, walk the user through these — they are legal obligations in Germany, not nice-to-haves. Run `/dsgvo` (no argument) for the full picture; the minimum to check here:

- [ ] **Privacy policy (Datenschutzerklärung)** reachable from every page — required as soon as any personal data is processed, which includes server logs
- [ ] **Impressum** — a separate German obligation (DDG), independent of data protection, required for commercial sites
- [ ] **AVV / DPA signed** with every processor: Supabase, the host, error tracking. Usually a checkbox or download in the provider's dashboard — list which ones this project uses and have the user do it
- [ ] **Consent before loading** anything non-essential (analytics, marketing pixels). Loading the tracker on page view and asking afterwards is the most common finding in German audits
- [ ] **Error tracking scrubs personal data** before sending — see `error-tracking.md`
- [ ] **Data region** matches what's in PRD Constraints; for an EU audience the hosted Supabase project belongs in `eu-central-1` (Frankfurt) and **cannot be moved later**

State the boundary when you present this: it is an engineering checklist, not legal clearance — a lawyer or Datenschutzbeauftragter confirms the rest.

Once the headers/tracking are in place, run **`/security-check`** against the live URL — a non-destructive check that the deployed app is actually secure (HTTPS, headers live, protected routes require login, no secrets leaked to the browser, Supabase RLS holds). Re-run it after any later change that touches auth, data access, or headers.

### 6. Post-Deployment Bookkeeping
- Update `features/INDEX.md` — the **single** record of deployment: set **every** feature in the launch set to **Deployed**, capturing production URL, deployment date, and the release tag. Do **not** copy any of this into `spec.md`: the contract carries no status or deployment metadata, and a second copy only drifts.
- Create **one** git tag for the launch and push it:
  - Single feature: `git tag -a v1.X.0-PROJ-X -m "Deploy PROJ-X: [Feature Name]"`
  - Multiple features (one release): a release tag covering them all, e.g. `git tag -a v1.0.0 -m "Launch: PROJ-A, PROJ-B, … "`
  - `git push origin <tag>`
- **Tidy up the branches that are now done.** Every branch in the launch set is merged and live, so it has no reason to exist any more — and a shrinking branch list is what keeps the next deploy readable. Offer it, never assume:
  > "PROJ-2 and PROJ-5 are live and their branches are fully merged. Shall I delete `feat/PROJ-2-…` and `feat/PROJ-5-…`? The work stays in `main` — only the labels go."
  - Only after the user agrees: `git branch -d feat/PROJ-X-name` (lower-case `-d` refuses to delete anything unmerged — never use `-D`), then `git push origin --delete feat/PROJ-X-name` for the remote copy.
  - **Never touch** branches outside the launch set, unmerged branches, anything the user said they are still working on in Step 3, or anything they did not answer about. Only what they explicitly released.
- Suggest `/cleanup` for the features that just shipped — now that they're live, their open questions are closed and their fixed bugs are history. It proposes everything before touching a file.

## Common Issues

### Build fails on the host but works locally
- Check the Node.js version (the host may use a different one — set it to match yours)
- Ensure all build-required dependencies are in `dependencies`, not just `devDependencies`
- Review the host's build logs for the specific error

### Environment variables not available
- Verify the vars are set in the host's panel (Vercel: Settings → Environment Variables; Hostinger: the app's environment-variables section)
- Client-side vars need the `NEXT_PUBLIC_` prefix
- Redeploy after adding or changing env vars (they don't apply retroactively)

### Database connection errors
- Verify the Supabase URL and anon key in the host's env vars
- Check RLS policies allow the operations being attempted
- Verify Supabase project is not paused (free tier pauses after inactivity)

## Rollback Instructions
If production is broken:
1. **Immediate — roll back to the last good deployment:**
   - Vercel: Dashboard → Deployments → "..." on the last working deployment → "Promote to Production"
   - Hostinger: in the panel, redeploy the previous working commit / roll back to the previous deployment
2. **Fix locally:** Debug the issue, `npm run build`, commit, push
3. Your host auto-deploys the fix

⚠️ **The rollback puts the old code back — it does not put the old database back.** Migrations applied in Step 2b stay applied; there is no "un-push." Say this out loud instead of letting the user assume the app is fully restored:
- The old code now runs against the **new** schema. That is usually fine (added tables and columns are ignored by code that doesn't know them) and usually broken if the migration **removed or renamed** something the old code still reads.
- Never try to undo it by editing or deleting the migration file — production's ledger has already recorded it. If the schema genuinely has to go back, that is a **new** corrective migration (`supabase migration new revert_<what>`), written deliberately, tested locally, and pushed like any other. Reverting schema can destroy data, so it needs the same plain-language preview and go-ahead as the original push.
- This is why the order in Step 2b matters: destructive schema changes are the ones you cannot walk back, so flag them *before* the push, not after.

## Full Deployment Checklist
- [ ] Scope resolved (one feature, or all ready features) and confirmed with the user — never a silent mass-deploy
- [ ] Every feature in the launch set passed `/qa` (no Critical/High); unverified features excluded
- [ ] Pre-deployment checks all pass
- [ ] Database promoted to production per the Environment strategy (Step 2b) — once for the whole set; for `branching`, the combined schema change was previewed in plain language and confirmed before Merge
- [ ] For `local`: the interactive steps (`supabase login`, `supabase link` incl. the database-password prompt) were handed to the user, not run at them; `db push --dry-run` was shown and translated into plain language before the push; `migration list` afterwards confirms every local migration is on production
- [ ] For `two-projects`: the set of migrations prod already has was established from `features/INDEX.md` and **confirmed by the user** before any SQL was handed over — nothing pasted twice
- [ ] No pushed migration was edited or deleted to "fix" anything; corrections went in as new migration files
- [ ] Branch stock-take done before merging: every `feat/*` branch matched against INDEX, **every open one shown to the user and asked about** — nothing merged or deleted that they didn't explicitly release, and no answer treated as "keep"
- [ ] Any unmerged branch on an already-**Deployed** feature raised with the user and resolved by them
- [ ] All feature branches in the set merged into `main` after explicit user go-ahead; pushed once; no unresolved merge conflicts
- [ ] Branches of the launched features offered for deletion (merged only, `-d` never `-D`), local and remote
- [ ] Host build successful
- [ ] Production URL verified over HTTP (200, HTTPS, pages render, API answers, protected routes still protected, no 500s)
- [ ] The browser- and dashboard-only checks were **asked of the user**; their answer recorded — or written down as not verified if they didn't check
- [ ] Error tracking setup (Sentry or alternative)
- [ ] Security headers configured in next.config
- [ ] `/security-check` run against the live URL — no critical findings (HTTPS, headers, auth-required routes, no exposed secrets, Supabase RLS)
- [ ] Lighthouse score checked (target > 90)
- [ ] `features/INDEX.md`: every launched feature set to Deployed with deployment info (URL, date, tag) — the single record; nothing copied into `spec.md`
- [ ] One release tag created and pushed (covers the whole launch set)
- [ ] User has verified production deployment

## Git Commit
Single feature:
```
deploy(PROJ-X): Deploy [feature name] to production

- Production URL: https://your-production-url
- Deployed: YYYY-MM-DD
```
Launching multiple features as one release:
```
deploy: Launch [v1.0.0] — PROJ-A, PROJ-B, … to production

- Production URL: https://your-production-url
- Deployed: YYYY-MM-DD
```
