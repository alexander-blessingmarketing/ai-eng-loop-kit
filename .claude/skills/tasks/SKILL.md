---
name: tasks
description: Break an approved feature design into an ordered, traceable, parallelizable task list (tasks.md). Run after /architecture, before /build.
argument-hint: "PROJ-X"
user-invocable: true
---

# Task Planner

## Goal
Break the approved feature design into an ordered, traceable task list that `/build` works through — sequentially or in parallel. You produce the parallelization plan; you do NOT write code. The task list (`tasks.md`) is the bridge between the WHAT (`spec.md`), the HOW (`design.md`), and the actual build.

## Before Starting
1. Read `features/PROJ-X-*/spec.md` — you need the **AC-IDs** (AC-1, AC-2, …) and **EC-IDs** (EC-1, EC-2, …); these are the traceability backbone.
2. Read `features/PROJ-X-*/design.md` — the Component Tree, Data Model, and API design you'll derive tasks from.
3. Read `features/INDEX.md` — current status and what's already shipped.
4. Verify: the feature's status in INDEX.md is **"Architected"** AND `design.md` exists on disk.

**If the status is not "Architected" or `design.md` does not exist:**
> "This feature has no approved design yet. Run `/architecture PROJ-X` first."
→ Stop here.

## Workflow

### 1. Derive Tasks from Design + Spec
Walk the `design.md` Component Tree, Data Model, and API design, and turn each into the concrete work steps needed to build it. Map every step to the **AC-ID(s)** it satisfies.

**Coverage check:** every AC in `spec.md` must be covered by at least one task. An AC with no task is a hole in the plan — add a task or explain the gap before continuing.

### 2. Group Tasks into Dependency LEVELS
Group tasks into levels by dependency, so each level only depends on levels before it. Typical shape:
- **Level 1 — Data / Schema** (tables, migrations, RLS, types)
- **Level 2 — API** (routes, server actions, validation)
- **Level 3 — UI** (components, pages, wiring to real endpoints)
- **Level 4 — Polish** (states, responsiveness, a11y, integration tests)

Levels run **sequentially** — they are barriers. This is what preserves "data contract before UI": the schema/API levels finish before the UI level starts. Not every feature needs all four levels; collapse or drop empty ones.

### 3. Assign [P] — Strictly by the Disjointness Rule
Within a single level, mark a task **[P]** only when it can run in parallel with the other [P]-tasks of that level. The rule is hard:

> A task may be **[P]** only if its `files:` set is **DISJOINT** from every other [P]-task in the same level. If two tasks touch the same file, they are NOT both [P] — sequence them (drop [P] from one) or merge them into one task.

Tasks in different levels are never parallel with each other (the level barrier handles ordering). [P] is purely about parallelism *within* one level. When in doubt, leave [P] off — a false [P] causes parallel writers to collide in `/build`.

### 4. Give Each Task `files:` + AC-Refs
Every task line carries: an ID, optional `[P]`, a short action, `files:` with the explicit path(s) it writes, and `→` the AC-ID(s) it satisfies. The `files:` list is what the disjointness rule is checked against, so make it accurate.

Keep tasks **coarse-grained** — meaningful checkpoints, roughly **5–20 per feature**, not micro-steps. "Create todos table + RLS + types" is one task; do not split it into "add column", "add policy", "add type".

### 5. Present the Plan and Get Approval (Human-in-the-Loop)
Show the user the full leveled task list — this is the **parallelization plan** that `/build` will fan out against. Walk them through the levels, what runs in parallel, and the AC coverage. Apply feedback. Do not write the file or advance status until the user approves the plan.

### 6. Write tasks.md
Using [template.md](template.md), write the approved task list to `features/PROJ-X-*/tasks.md` (same folder as `spec.md` and `design.md`).

### 7. Update Tracking
Set the feature's status in `features/INDEX.md` to **"Tasked"**.

## Important
- **The disjointness rule is non-negotiable.** [P] is a promise that parallel `/build` agents won't touch the same file. A wrong [P] corrupts the build. Verify every `files:` set against its siblings before marking [P].
- **No micro-tasks.** Coarse, checkpoint-sized tasks (~5–20). If you're past ~20, you're slicing too thin.
- **Every task traces to an AC.** A task with no `→ AC-x` is scope you can't justify — drop it or find the AC it serves.
- You write the plan, not the code. `/build` implements; you only decide the order and the parallelism.

## Checklist Before Completion
- [ ] Read `spec.md` (AC-IDs), `design.md`, and `features/INDEX.md`
- [ ] Status was "Architected" and `design.md` existed
- [ ] AC coverage complete — every AC mapped to at least one task
- [ ] Tasks grouped into levels in dependency order (data → API → UI → polish)
- [ ] [P] assigned strictly by the disjointness rule — no two [P] tasks in a level share a file
- [ ] Every task has explicit `files:` and `→` AC-Refs
- [ ] Tasks coarse-grained (~5–20), no micro-steps
- [ ] User has reviewed and approved `tasks.md` (the parallelization plan)
- [ ] `tasks.md` saved to `features/PROJ-X-*/tasks.md`
- [ ] `features/INDEX.md` status updated to "Tasked"

## Handoff
> "Task breakdown ready and approved. Run `/build` to implement PROJ-X — independent tasks run in parallel."

## Git Commit
```
docs(PROJ-X): Add task breakdown for [feature name]
```
