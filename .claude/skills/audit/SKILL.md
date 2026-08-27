---
name: audit
description: Check that the project's documentation still matches reality — INDEX status, feature folders, the AC→Task→Test chain, and code that has no spec. A read-only drift report in plain language. Run anytime, especially before /deploy or after quick ad-hoc changes.
argument-hint: "optional PROJ-X to audit a single feature"
user-invocable: true
---

# Project Audit

## Goal
Detect drift — verify the project's documentation still matches reality, so nothing rots silently as you build features, fix bugs, and make quick changes. Read every tracking file and the actual files and code on disk, then report, in plain language a non-coder can act on, exactly where they disagree and which skill closes each gap. This is **read-only**: it never edits specs, INDEX, or code. The fixes route through the proper skills so the AC → Task → Test chain stays intact.

## When to run
- Anytime you're unsure the docs reflect what was actually built.
- **Before `/deploy`** — ship from a known-consistent state.
- After a batch of quick fixes or conversational "just change this" requests that may have bypassed the skills.
- When returning to a project after a break.

## Before Starting
1. Read `features/INDEX.md` (the status source of truth) and `docs/PRD.md`.
2. For each `features/PROJ-X-*/` folder, note which of `spec.md`, `design.md`, `tasks.md`, `qa-report.md` exist.
3. Scan the real code surface: `git ls-files src/app/api/`, `ls src/app/`, `ls src/components/*.tsx`, `src/app/layout.tsx`, `git log --oneline -15`, `git status -s`.
4. Read `docs/app-shell.md` if it exists — the app-wide frame and, at its top, which feature owns it.

If a `PROJ-X` argument was given, scope the audit to just that feature.

## Checks
Run each and classify ✅ (in sync) or ⚠️ (drift — always with the fix).

### 1. INDEX ↔ folders
- Every feature row in INDEX has a matching `features/PROJ-X-*/` folder, and every folder appears in INDEX. Flag orphans in both directions.
- `Next Available ID` is higher than every used PROJ-X.

### 1b. Migrated features — read this before flagging anything
A `spec.md` whose first lines carry `> Migrated from the AI Coding Starter Kit` documents a feature that was **built before this kit's chain existed**. For those features, two of the checks below would fire on every single one and every one of those findings would be wrong:

- **A missing `tasks.md` is expected, not drift.** There was no `/tasks` step when the feature was built, and a task list written now would describe work that is already done.
- **An AC with no task is expected, not a finding.** Same reason. Do not report it, not even as low severity — a page of red on a feature that is live and working teaches the user to ignore the report.

What still counts, unchanged: **an AC with no result in `qa-report.md`**. That one is real — it says the criterion was never verified — and it is the reason to keep reading these features at all.

Say once in the report how many features are in this state, and that `/refine PROJ-X` is what brings one into the chain for real. Do not repeat it per feature.

### 2. Status ↔ artifacts
Each status promises certain files exist. Flag mismatches **either way** (except as set out in 1b):
- **Planned** → `spec.md`
- **Architected** → + `design.md`
- **Tasked** → + `tasks.md`
- **In Progress** → `tasks.md` present, build underway
- **In Review / Approved** → `qa-report.md`
- **Deployed** → deployment recorded in INDEX

Typical drift: status says "Architected" but there is no `design.md`; a `qa-report.md` exists but status is still "Tasked"; a folder has every file but INDEX still says "Roadmap".

### 3. AC → Task → Test chain (the backbone)
For each feature that has a spec: every AC-ID in `spec.md` should be referenced by at least one task in `tasks.md` and reported on in `qa-report.md` (where those files exist for the feature's status). Flag ACs with **no task** (won't get built) or **no test** (won't get verified). Broken links here are the most important drift to surface — **except on a migrated feature (1b), where "no task" is expected and only "no test" counts.**

### 4. Contract integrity
`spec.md` should still be the clean WHAT. Flag it if it has grown implementation or tech-design sections that belong in `design.md` — the spec is read-only during build, so pollution means something wrote to the contract.

Also flag any **leftover status or date header** in `spec.md`, `design.md`, or `tasks.md` (`## Status: …`, `**Status:** …`, `**Created:** …`, `**Last Updated:** …`). Projects created before these were removed still carry them, and nothing updates them — so they show a status that was true once and has been wrong ever since. The fix is to delete the line, not to correct it: the feature's status lives only in `features/INDEX.md`.

### 5. Code without a spec (the ad-hoc drift)
Map the real code surface to features. Flag app code that no feature seems to own — an API route, page, or custom component with no corresponding spec/AC. This is the classic result of "just build/fix this" outside the flow. Say so plainly: the code may be fine, but it's undocumented — back-fill it with `/write-spec` (or `/refine` the owning feature), or remove it if it was a throwaway.

### 6. The app shell ↔ its owner (the cross-cutting drift)
Check 5 finds code that no feature owns. This one finds the special case that hides in plain sight, because it lives in *every* feature at once: the **app shell** — the frame around all pages (layout, sidebar or top nav, logo, mobile burger, the page-header pattern).

Read `docs/app-shell.md` (the app-wide map, if it exists), then look at what's really there: `src/app/layout.tsx`, and components whose names or contents point at the frame (`*sidebar*`, `*nav*`, `*header*`, `*shell*`, `*layout*`). Flag:

- **A shell with no owning feature.** Real shell components exist, but no `spec.md` has acceptance criteria for them — `docs/app-shell.md` has no owner recorded, or names one that isn't in INDEX. This is the important finding: the shell works, but nothing defines what it must do, so any later rework has nothing to test against. → back-fill one small feature with `/write-spec` ("App Shell & Navigation"), describing the shell **as it is today** plus what should change; existing features only get a reference via a light `/refine`.
- **Shell grown by accretion.** Two or more features' `design.md` describe the same shell element (each adding its own nav entry, header variant, or mobile behavior). Name the features you found it in — that list *is* the evidence that it belongs to none of them.
- **Map missing or stale.** The app clearly has navigation but there is no `docs/app-shell.md` → `/architecture` writes it from what exists. Or the map lists areas the nav doesn't have (or the nav has areas the map never got) → the map drifted; say which entries disagree.
- **No shell to speak of** (a single-screen tool) → not drift. Don't manufacture a finding; the frame genuinely belongs to the one feature that owns the screen.

### 7. Feature branches ↔ INDEX
Features are built on `feat/PROJ-X-name` branches, so branches pile up over a project's life. Compare them against INDEX:

```bash
git branch --list 'feat/*'
git branch --no-merged main --list 'feat/*'
```

- **Unmerged branch on a feature INDEX calls "Deployed"** — the most important finding here. The feature is recorded as live but some of its commits never reached `main`: either it isn't fully live, or the branch holds work that was dropped. Only the user knows which. → raise it, don't guess.
- **Merged branch on a Deployed feature** — done; harmless clutter. → `/deploy` offers to delete these after a launch.
- **Unmerged branch on a feature still In Progress / In Review / Approved** — normal, work in flight. **Not** drift; don't report it as one.
- **Branch with no matching PROJ-X** — an experiment or abandoned work. → ask the user what it is.
- **Approved feature with no branch at all** — it was built on `main`. Fine, but worth a line, since `/deploy` will find nothing to merge.

### 8. Working language consistency
The project has **one** working language (`CLAUDE.md` → Key Conventions → Working language). Half-translated documents are real drift: they make the AC → Task → Test chain harder to follow and they signal that some skill wrote without reading the setting.

- **The setting itself is missing** or still shows the raw `{{WORKING_LANGUAGE}}` placeholder → `/verify-setup` records it.
- **A document is in the wrong language** — the PRD is German but a `spec.md` is English, or vice versa. Name the file.
- **A document is half-translated** — the classic case, and the one worth looking for hardest: acceptance criteria in one language under headings in the other (`Angenommen/wenn/dann` in an otherwise English spec, or `Given/when/then` in a German one), or a German `design.md` whose `tasks.md` is English.

Do **not** flag as drift: code identifiers, file and folder names, commit messages, branch names, the kit's own files (`.claude/**`, `docs/production/**`, `features/README.md`), or established technical terms left untranslated (*Acceptance Criteria*, *Edge Case*, *Deploy*, *Row Level Security*, *Severity*).

The fix is never a bulk translation: route it to the owning skill (`/refine PROJ-X` for a spec, `/architecture` for a design) so AC- and EC-IDs survive. Say that explicitly when you report it.

### 9. Uncommitted / untagged work (light)
Note uncommitted changes (`git status -s`) and recent commits whose messages lack a `PROJ-X` tag — both can signal work that skipped the documented flow.

## Output
A plain-language report grouped by feature, each drift item with its one-line fix:

```
🔎 Project Audit

✅ In sync
   PROJ-1 Supabase Setup — Deployed, all files present, ACs traced
   PROJ-2 Task Board    — Approved, qa-report covers AC-1…AC-5

⚠️ Drift found (3)
   PROJ-3 Comments — INDEX says "Architected" but there is no design.md
      → Run /architecture PROJ-3  (or correct the status if it was a slip)
   PROJ-2 Task Board — AC-4 has no test in qa-report.md
      → Run /qa PROJ-2 to cover AC-4
   src/app/api/export/ — API route with no owning feature
      → Run /write-spec to back-fill a spec, or remove it if it was a throwaway
   feat/PROJ-1-auth — 4 commits never merged, but PROJ-1 is marked Deployed
      → Check with the user: unfinished work, or a branch you decided against?
   App shell (sidebar, logo, header) — no owning feature; grown across PROJ-1/2/3
      → Run /write-spec for "App Shell & Navigation" so it has acceptance criteria

Summary: 2 in sync · 4 drift items · 0 critical
```

## Important
- **Read-only.** Never edit specs, INDEX, or code — report and route. Fixes belong to the owning skills so the AC → Task → Test chain stays intact.
- **Drift is not clutter.** You report documents that *disagree* with reality. Documents that are merely long — resolved questions, fixed bugs, sprawling decision logs — are `/cleanup`'s job, not a drift finding. Route them there instead of flagging them here.
- Plain language, no dev jargon — the audience is a non-coder.
- Distinguish real drift from the harmless: a deliberately deferred Open Question or a documented Out-of-Scope item is **not** drift.
- If everything is in sync, say so clearly and stop — never manufacture findings.

## Handoff
- All green:
  > "Everything's in sync. You're safe to keep building or run `/deploy`."
- Drift found: list the exact skills to run, **most important first** (broken AC → Task → Test chains before cosmetic status fixes), then:
  > "Fix these in order, then run `/audit` again to confirm you're back in sync."
