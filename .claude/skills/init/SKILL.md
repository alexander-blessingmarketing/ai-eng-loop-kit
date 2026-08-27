---
name: init
description: Initialize a project for the kit. In a new project, interviews the user and creates the PRD and a prioritized feature map. In a project the kit was added to, skips the interview and instead records what the project is and how to run, verify and deploy it. Run once at the start. If a PRD is empty (raw template structure) use this skill to plan out the project together with the user.
argument-hint: "description of what you want to build"
user-invocable: true
---

# Project Initializer

## Goal
Help the user turn a raw idea into a clear product vision and a prioritized feature map — before any code is written. Get there through a relentless, one-question-at-a-time interview (see The Discovery Interview below), because a vague PRD now turns into the wrong features later.

## The Discovery Interview
Interview the user relentlessly until you reach a **complete shared understanding** of the project. Follow these rules strictly:

- **One question at a time** — never list multiple questions
- **Always provide a recommended answer** — the user confirms or corrects it
- **Follow the conversation** — open new branches based on answers, don't follow a fixed script
- **Explore before asking** — if a question can be answered by reading existing files, read them first
- **No fixed question limit** — stop when you truly understand the project, not after N questions

### End every turn with a question — then STOP (critical)
This is the single most important rule of this skill. The user can only see what you write, and they only know it's their turn when you **end on a clear question**.

- **Every turn in the interview and at every review checkpoint MUST end with exactly one question as the very last line** — never on a statement, a summary, or a status note like "I've captured the key points."
- **The question is the last thing in the message.** Put any context first, the question last, so it can't get buried.
- After asking, **stop and wait.** Do not keep working, do not assume the answer, do not move to the next phase until the user has replied.
- If you ever finish a chunk of work and are unsure what to do next, that is itself the signal to **ask the user a question** — never end your turn silently.

### If the user pasted a full briefing
When the argument is already a rich briefing (not a one-line idea), do **not** mechanically interview point by point as if you knew nothing. Instead:
1. Read the briefing and silently note what it already answers.
2. Identify only the **genuine gaps and contradictions** that still block a solid PRD (especially the two Mandatory decisions below).
3. Work through those gaps **one question at a time**, each turn ending on a question (per the rule above).
4. When no blocking gaps remain, go straight to the PRD draft and its review checkpoint — don't invent filler questions.

## Before Starting
0. Read `.ai-eng-kit` → `mode`. If it is `existing`, the kit was **added to a project that already runs** — skip the Discovery Interview entirely and follow "Existing Project" below instead. A missing key means `new`.
1. Read `docs/PRD.md` — check if it's still the empty template
2. Read `features/INDEX.md` — check if features already exist
3. Read the **working language** from `CLAUDE.md` → Key Conventions (the user chose it at setup). **Run the entire interview in it** — every question, recommendation, and review checkpoint — and write every document you create in it. This skill is written in English because it instructs *you*; it is not the language you speak. See `.claude/rules/general.md` → Working Language. If the line is missing (older project), ask the user once, then add it to `CLAUDE.md` under Key Conventions before you write anything.

**The scaffolded documents ship with English headings.** You are their first author, so when the project language is not English, translate the headings and the guiding prose as you fill them in — `docs/PRD.md`, `docs/data-model.md`, and `docs/app-shell.md` must not end up as English skeletons with content in another language. Leave the HTML comments and the file names alone.

**If the project is already initialized** (PRD is filled out and not the empty template):
→ Tell the user: "This project is already initialized. Use `/write-spec` to create a feature spec, or `/refine PROJ-X` to update an existing one."
→ Stop here.

## Existing Project (`mode: existing`)

A greenfield interview is the wrong instrument here. The product already exists, the stack decisions were made long ago, and the code is the source of truth — inventing a vision for something that already ships is how a PRD ends up describing a product nobody built.

Your job is narrower and more useful: **record how this project runs**, so every later skill stops guessing. Four things, one question per turn, each ending the turn (the rule above applies unchanged).

**Propose, don't interrogate.** `.ai-eng-kit` already holds what the project's own files stated at install — `stack`, `commands`, `packageManager`. Read it first and put those values *into* your questions as the recommended answer. A `null` means it could not be read from a file, not that it is absent.

**Never fill a field from what the repo looks like to you.** A detected `framework: vite` came from a dependency entry and is a fact. "This looks like it deploys to Vercel" is a guess, and `/deploy` will act on it. Ask.

1. **What is this, and who is it for?** One or two sentences. Read the README and the memory file first and offer what you found as the answer to confirm.
2. **How is it started and how do you check it works?** The one that matters most. You need the start command and, concretely, how a claim gets verified against a running instance — an HTTP base URL, a stdio/JSON-RPC client, a simulator, or honestly nothing automatable. Record this as `probe`: `kind` is one of `http`, `stdio-jsonrpc`, `simulator`, `none`, and `baseUrl` where a URL applies.
3. **What is the stack?** Confirm or correct what was detected: framework, backend/database, test runner, package manager. Fill only what the user confirms.
4. **How does it go live?** Hosting and the deploy path, including anything human-gated (a review, an approval, a release window). If there is no deploy path yet, record that — it is a real answer.

### Record the answers
- Write them into `.ai-eng-kit`: `platform` (`web`, `mcp`, `mobile`, `cli`, `other`), the confirmed `stack`, `commands`, and `probe`. Keep the JSON valid and change nothing else in the file.
- Mirror the same values into the memory file's **How This Project Runs** section, so an agent that never opens `.ai-eng-kit` still reads them. That section is generated from the answers — do not invent extra prose around it.

### Then write a short PRD
`docs/PRD.md`, describing the product **as it is**, not as you would design it: what it does, who for, the constraints that already hold (stack, hosting, compliance, anything the user named as fixed). Keep it short. It exists so `/write-spec` and `/architecture` have an anchor — it is not a rewrite of the product's history.

Skip everything a greenfield project decides and this one already has: the Backend Decision, the Design System question, the app-shell sketch, and the app-wide data model. They are settled in the code. If `docs/app-shell.md` or `docs/data-model.md` are still empty templates, leave them empty rather than filling them from a skim of the repo — an inaccurate map is worse than a missing one, because `/architecture` treats it as true.

### Feature map: what's next, not what exists
`features/INDEX.md` gets the features the user wants to build **from here on**. Do not attempt to reconstruct the existing product as retro-features — that is a much larger job than an interview, and half-done it produces specs that contradict the code.

**Review checkpoint — STOP here.** Present what you recorded and end your turn with a clear approval question, e.g.:
> "Here's how I understood your project and how I'll check my own work against it. Does that match — and is there anything about running or deploying it I got wrong?"

Only after approval, save the files. Then hand off to `/write-spec` for the first feature.

## Interview Phase

*(New projects only. For `mode: existing`, use the section above.)*

Start the conversation based on the argument the user provided. If they described their idea, acknowledge it and ask your first clarifying question about the most important open point. If no argument was given, ask:

> "What do you want to build, and what problem does it solve?"
> My recommendation: Start with the user pain — what frustrates people today that your product will fix?

Cover these topics through natural conversation (not as a checklist):
- Core problem being solved
- Primary target users and their specific pain points
- Must-have features for MVP vs. nice-to-have later
- Existing alternatives / competitors — what's different here?
- Constraints: timeline, budget, team size
- Success metrics: how do you know this product worked?
- Non-goals: what are you explicitly NOT building in this version?

### Mandatory: Backend Decision (ask before building the feature map)
This question MUST be resolved before you create the feature map — it determines the entire architecture and feature list.

Ask:
> "Does the app need to store data persistently or sync between users/devices?"
> My recommendation: Yes — most apps need at least local persistence. If multiple users or cross-device sync is needed, a backend is required.

**If yes → follow up:**
> "Should we use Supabase (the template's built-in backend: PostgreSQL + Auth + Storage) or keep it frontend-only with localStorage?"
> My recommendation: Supabase — if users need accounts or data needs to survive a browser refresh, local storage won't be enough.

**If Supabase is chosen:**
- **Do NOT create a "Supabase Infrastructure Setup" feature.** Getting Supabase running (local stack, `.env.local`, client wiring) is **project setup, not a feature** — it has no user-facing behavior and no real user story. `/verify-setup` owns it (it runs `supabase init`/`start` and wires the clients on its post-`/init` re-run).
- **Accounts/auth ARE a feature.** If the app needs user accounts, make the **first feature a real "User Accounts & Auth" feature** — signup/login *together with* its data foundation (the `profiles` table, the per-user RLS pattern, the signup→profile trigger). Frame it with genuine user stories ("As a user I want to sign up and be sure only I can see my data"). That feature establishes the per-user RLS pattern every later feature copies; `docs/data-model.md` is the shared map.
- Features that need per-user data depend on the **Accounts & Auth** feature (not on an infra feature).
- Then resolve the **Environment Strategy** sub-question below before building the feature map.

**If frontend-only (localStorage):**
- No infrastructure feature needed
- Note "No backend — localStorage only" in the PRD Constraints section
- Skip the Environment Strategy question — it only applies to Supabase.

#### Mandatory sub-question: Environment Strategy (only if Supabase is chosen)
This decides whether the user has a separate place to test before touching live data. Use the **AskUserQuestion tool** so the choice is an unmissable prompt, not buried text. Ask:

> "How do you want to handle test vs. live data? You can always change this later."
> - **Local (recommended) — free, fully isolated** — Supabase runs on your own machine via Docker while you build; when you deploy, your database is migrated to a live hosted project. Best isolation, $0. Needs **Docker** and the **Supabase CLI** installed (the setup check helps with this).
> - **Two projects — free** — a separate hosted "dev" project to test in and a "prod" project for real users. Free tier covers both. No Docker needed.
> - **No test environment (single project)** — one hosted Supabase project, you work directly against it. Simplest. ⚠️ Your dev work touches the same data your live app uses.
> - **Branching (Pro setup) — ~$35/mo** — one project with an always-on "staging" branch; promote to live with a Merge click. Needs Supabase Pro.

My recommendation: **Local** — it's free, your dev work can never touch live data, and it's the official Supabase dev workflow. If the user can't run Docker, **Two projects** is the best no-Docker alternative.

**Record the choice** as a single line in `docs/PRD.md` under Constraints — every later skill reads it from there:
- `Environment strategy: local` — local Supabase (Docker) for dev, migrated to a hosted project at `/deploy`.
- `Environment strategy: two-projects` — dev + prod hosted projects.
- `Environment strategy: single` — one hosted Supabase project (test == live).
- `Environment strategy: branching` — one Pro project, persistent "staging" branch promoted to production by Merge.

**What each strategy means** (this is *setup + deploy plumbing*, handled by `/verify-setup` and `/deploy` — NOT a feature):
- **local** → `/verify-setup` runs Docker + Supabase CLI, `supabase init`/`start` the local stack, puts the **local** keys in `.env.local`. The hosted live project is created and migrated to at `/deploy`.
- **two-projects** → the user creates a **dev** project (keys → `.env.local`) and a **prod** project (keys used at `/deploy`); `/verify-setup` checks `.env.local`. Prod schema is applied at `/deploy`.
- **single** → one hosted project; its keys go in `.env.local`.
- **branching** → upgrade to **Pro**, create a persistent **staging** branch (keys → `.env.local`); production is promoted at `/deploy` via Merge.

Record only the `Environment strategy:` line in PRD Constraints — there is no infra feature to scope.

##### Region: pick the EU one, and say why (only if Supabase is chosen)
Whenever a **hosted** Supabase project gets created — here, at `/verify-setup`, or at `/deploy` — the region must be chosen deliberately. For a German or EU audience that is **`eu-central-1` (Frankfurt)**.

Tell the user this once, plainly, because it is the one setting they cannot walk back:

> "When you create the Supabase project, pick the region **Frankfurt (eu-central-1)**. It keeps your users' data in the EU, which is what German data-protection law expects — and unlike almost everything else, **the region can't be changed later** without migrating the whole database."

Record it in PRD Constraints: `Data region: eu-central-1 (Frankfurt)` — or whichever region the user actually chose, so `/dsgvo` and `/deploy` can see it.

##### Record the decision in `.ai-eng-kit`
Once the user has decided, set `stack.backend` to `supabase` or `localstorage`. The scaffolder leaves it `null` on purpose — it ships the Supabase client, but whether the product uses it is this decision, not a property of the template. `/build`, `/qa` and `/deploy` read that field to know whether there is a database to migrate, RLS to check, and schema to promote at all. Keep the JSON valid and change nothing else.

### Mandatory: Data Protection Stance (ask before building the feature map)
Only ask when the product will hold **personal data** — user accounts, contact details, uploads, free-text fields, anything a person types about themselves. A frontend-only tool with no accounts and no user input can skip this entirely; say so and move on.

Use the **AskUserQuestion tool**:

> "How much data-protection work do you want to carry? This sets how deeply I'll look at it — it doesn't change what the law requires."
> - **Lean** — small MVP, few users, nothing sensitive. Cover the basics, keep friction low.
> - **Standard (recommended)** — a real product with user accounts, aimed at the public. The usual duties, documented.
> - **Strict** — sensitive data, employee data, business with public bodies or larger companies, or you simply want it airtight.

Record it in PRD Constraints: `Data protection stance: lean | standard | strict`.

Then say the boundary once, so the expectation is set from the start:

> "I'll flag data-protection risks as we go and turn them into requirements we can actually build. I'm not a lawyer and I won't tell you that you're compliant — for that you need one, or a Datenschutzbeauftragter."

If the product will obviously hold **special category data** (health, biometrics, ethnicity, religion, sexual orientation) or **children's data**, name that now, not later — it changes the shape of the whole product and it is far cheaper to know at the feature-map stage.

### Mandatory: Design System (ask before building the feature map)
Ask:
> "Do you have an existing design system, brand guidelines, or UI reference I should follow?"
> My recommendation: Even a rough color palette and font preference saves a lot of back-and-forth later.

**Three ways the user can answer:**
1. **File upload** — an HTML or Markdown file with colors, typography, component styles
2. **Manual input** — the user describes it directly (e.g. "dark theme, Inter font, blue primary #2563EB")
3. **None** — the common case, and the one that decides how the app will look

**`docs/design-system.md` gets written either way.** Answer 3 means *you* propose one, not that the question is dropped — five later steps read this file, and "no answer" used to leave it missing, which is how an app ends up looking like an untouched component library. Ask two quick questions to anchor the proposal (what the product is, and one adjective for the feel — "calm and professional", "bold and playful"), then write the file and show it for approval like every other artifact.

**What the file contains** — concrete values, never adjectives alone, because `/build` has to apply it without asking again:
- **Colors:** primary, secondary, accent, destructive, plus background/foreground for light *and* dark. Give actual values in the token format the stack uses.
- **Typography:** font family, the size scale, and which weights are used for headings vs. body.
- **Radius, spacing, elevation:** the base radius, the spacing rhythm, and whether the product uses shadows or borders to separate surfaces.
- **Component conventions:** default button size and variant, form field height, how empty and loading states look.

**Non-negotiable defaults** — put these in the file unless the user's own system contradicts them. They are what separates a product from a demo, and no acceptance criterion will ever ask for them:
- **Light and dark are both defined from the start.** Retrofitting dark mode means touching every component twice.
- **Never pure `#000` or `#fff`** for background or text — near-black and near-white read as designed, pure values read as unstyled.
- **Never a flat, unmodulated brand color** across large surfaces; give it a hover, an active, and a subtle-background variant.
- **Every interactive element has a visible hover *and* focus state.** Focus is an accessibility requirement, not a nicety — keyboard users have nothing else.
- **One radius decision, applied everywhere.** Mixed corner radii are the most common tell of an assembled-not-designed UI.
- **Text sits on a contrast ratio of at least 4.5:1** against its own background, in both themes.

Then:
- Add a note in `docs/PRD.md` under Constraints: "Design system: see `docs/design-system.md`"
- `/build` reads this file when implementing every feature

## After the Interview: Create the PRD

Once you have a complete understanding, write `docs/PRD.md` with:
- **Vision:** 2-3 sentences — what it is and why it matters
- **Target Users:** Who they are, their specific needs and pain points
- **Core Features (Roadmap):** Prioritized table (P0 = MVP, P1 = next, P2 = later)
- **Success Metrics:** Measurable outcomes
- **Constraints:** Timeline, team, budget, technical limitations
- **Non-Goals:** What will NOT be built in this version

**Review checkpoint — STOP here.** Present the draft PRD in the chat (do not save it yet) and end your turn with a clear approval question, e.g.:
> "Here's the draft PRD. Does this capture it correctly, or what should I change before I save it?"

Wait for the user's reply. Only after they approve, save `docs/PRD.md` and apply any feedback first.

## After PRD: Create the Feature Map

Apply Single Responsibility to break the roadmap into individual features:
- Each feature = ONE testable, deployable unit
- Identify dependencies between features
- Assign recommended build order (respecting dependencies)
- Assign priority: P0 = MVP, P1 = next, P2 = later

**The app shell IS a feature — when there is enough of it.** The frame around every page (logo, sidebar or top nav, the mobile burger, the page-header pattern) belongs to *no* feature by default, so it grows by accretion: each feature adds a nav entry and a header variant inside its own `design.md`, and nobody owns the whole. Rebuilding it later is then painful — there is no spec to `/refine`, because no acceptance criterion ever said what the shell should do.

- **More than two top-level areas** (or any app with accounts, where signed-out and signed-in look different) → propose **"App Shell & Navigation"** as its own early feature, right after Accounts & Auth. Its ACs are real and testable: which nav entries exist per auth state, the active-state marking, the mobile behavior below `md`, the shared page-header pattern.
- **A single-screen tool or a two-page MVP** → do **not** create it. The shell is a header and it fits in the one feature that owns the screen. Say so and move on; a mandatory shell feature would just be ceremony.
- Later features **depend on** the shell feature and reuse its components instead of adding their own navigation.

**What each feature entry in `features/INDEX.md` contains:**
- Feature ID (PROJ-1, PROJ-2, ...)
- Feature name
- One-line description
- Priority (P0/P1/P2)
- Dependencies (which other features it needs, or "None")
- Status: Roadmap

**Review checkpoint — STOP here.** Present the feature map in the chat and end your turn with a clear approval question, e.g.:
> "I've identified X features — here's the breakdown and recommended build order: […]. Does this look right, or should I split, merge, or re-prioritize anything before I save it?"

Wait for the user's reply. Only after they approve, apply any feedback, then update `features/INDEX.md` and the "Next Available ID" line.

## After the Feature Map: Sketch the App-Wide Data Model
Now that the whole feature set is known, sketch the **data the product manages, once and holistically** — before any single feature invents its tables in isolation. This is what keeps the data coherent: get the entities and their relationships right up front, so later features build against a shared map instead of bolting on mismatched tables and painful foreign keys.

**Stay at product altitude — this is modeling, not schema design:**
- Capture **entities** (the real-world nouns the app stores: `profiles`, `credit_ledger`, `feedback_items`, …), their one-line purpose, and **who owns/sees each**.
- Capture the **relationships** between them in plain language (a profile has many X; each X belongs to one Y).
- Do **NOT** specify column types, indexes, or exact foreign keys — that is technical *how*, decided per feature in `/architecture` (`design.md`). Entities + relationships + ownership only.

This applies **even to localStorage / frontend-only apps** — they still have data shapes worth mapping; they just won't become database tables.

Write it to `docs/data-model.md` using the template already there. It's a **living blueprint**: `/architecture` refines it as each feature is designed.

**Review checkpoint — STOP here.** Present the data-model sketch in the chat and end your turn with a clear approval question, e.g.:
> "Here's the app-wide data model — the entities and how they relate. Does this match how you picture the data, or is anything missing or connected wrong?"

Wait for the user's reply. Only after they approve, save `docs/data-model.md`.

## After the Data Model: Sketch the App Shell
Same move as the data model, for the UI: now that the whole feature set is known, decide **once** what frame the features live inside — before each one invents its own navigation. `docs/data-model.md` keeps the data coherent; `docs/app-shell.md` keeps the app *feeling* like one product.

You already know enough for this the moment the feature map exists: the top-level areas usually **are** the P0 features.

**Stay at product altitude — structure, not styling:**
- The **top-level areas** a user can navigate to, who sees each (signed out / signed in / per role), and which feature owns each.
- The **layout regions**: sidebar or top nav, header, content, and what happens on mobile.
- The **page pattern** every feature repeats: page header with title and primary action, loading, empty, and error states.
- Do **NOT** specify colors, fonts, or component styling — that is `docs/design-system.md`. Do **NOT** design a single feature's page internals — that belongs in that feature's `design.md`.

Write it to `docs/app-shell.md` using the template already there, and record the **owning feature** at the top (the App Shell feature if you created one, otherwise "none — shell is trivial"). It's a **living blueprint**: `/architecture` refines it as each feature is designed.

For a genuinely single-screen app, keep this short — a filled-in Page Pattern and "Owner: none — shell is trivial" is a complete answer. Don't manufacture navigation that the product doesn't have.

**Review checkpoint — STOP here.** Present the shell sketch in the chat and end your turn with a clear approval question, e.g.:
> "Here's the app shell — the areas in the navigation and the frame every page sits in. Does that match how you picture moving around the app, or is something missing?"

Wait for the user's reply. Only after they approve, save `docs/app-shell.md`.

## After Approval: Get the Backend Ready (no bounce — new projects only)

> **`mode: existing`: skip this section entirely.** The project already has whatever backend it has, running the way its team runs it. Standing a second stack up beside it is not setup, it is damage.

Once the PRD, feature map, and data model are approved, finish the project setup **right here** — don't send the user back to `/verify-setup`. What you do depends on the Environment strategy you recorded:

- **`local` (default):** stand up the local Supabase stack now, in this session. Run the **same steps as `/verify-setup`'s "Local Supabase setup" check**: confirm Docker is running and the Supabase CLI is available (hand off if either is missing), `supabase init` if needed, `supabase start` (warn first that the first run downloads ~GB of Docker images and takes a few minutes), make sure `src/lib/supabase.ts` is active, and tell the user the local API URL + anon key that `supabase start` printed to paste into `.env.local`. When it's up, the first feature can build against a real database immediately.
- **`two-projects` / `single` / `branching` (cloud):** there's nothing to start locally. Hand off in plain language what the user must do (create the hosted project(s), paste the test keys into `.env.local`) and point out that production is wired at `/deploy`.

This is project setup, not a feature — but it belongs to initialization, so it happens now rather than as a separate round-trip. If Docker/CLI is missing for `local`, hand off the one fix and let the user re-run `/verify-setup` (the repair path) — but in the normal case, no second visit is needed.

## What NOT to do
- Do NOT create feature folders or spec files (`features/PROJ-X-*/spec.md`) — that is `/write-spec`'s job
- Do NOT write code or make technical decisions. (The app-wide data model and the app shell are exceptions **only** at product altitude — entities/relationships/ownership, and areas/regions/page pattern. Column types, indexes, foreign keys, component trees, and styling are NOT yours here; they belong to `/architecture` and `docs/design-system.md`.)
- Do NOT ask multiple questions at once
- Do NOT end a turn on a statement or summary — every turn ends on a question, then you stop and wait
- Do NOT save the PRD or feature map before the user has approved it at its review checkpoint
- Do NOT stop early — keep going until you have full clarity on the project
- In `mode: existing`: do NOT rewrite, restructure or "tidy" anything that was already there, do NOT stand up a backend or a local stack, and do NOT fill `platform`, `stack`, `commands` or `probe` from what the repo looks like — only from what the user confirmed

## Checklist Before Completion — `mode: existing`
- [ ] `platform` recorded, and `stack` reflects what the user confirmed (not what was detected, where the two differed)
- [ ] `commands` recorded, and every command named actually exists
- [ ] `probe.kind` recorded — including `none` where nothing can be automated; an unanswered probe leaves `/qa` unable to verify anything
- [ ] The same values mirrored into the memory file's **How This Project Runs**
- [ ] `.ai-eng-kit` still parses as JSON, and nothing outside those four keys was changed
- [ ] Short PRD describes the product **as it is**, with the constraints that already hold
- [ ] `docs/app-shell.md` / `docs/data-model.md` left empty rather than filled from a skim
- [ ] `features/INDEX.md` holds only what comes **next** — no reconstructed retro-features
- [ ] Nothing existing was rewritten, restructured, installed or stood up
- [ ] User has reviewed and approved

## Checklist Before Completion — new projects
- [ ] PRD fully filled out (Vision, Target Users, Roadmap, Metrics, Constraints, Non-Goals)
- [ ] Backend decision resolved (Supabase vs. localStorage) **and written to `.ai-eng-kit` → `stack.backend`**
- [ ] If Supabase: NO "Supabase Infrastructure Setup" feature created — setup is owned by `/verify-setup`, not a spec
- [ ] If Supabase + accounts needed: first feature is a real "User Accounts & Auth" feature (signup/login + profiles + per-user RLS + signup→profile trigger), with user-facing stories; per-user-data features depend on it
- [ ] If Supabase: Environment strategy chosen (local / two-projects / single / branching) and written to PRD Constraints
- [ ] If Supabase: EU region (`eu-central-1`) named to the user as unchangeable, and the chosen `Data region:` written to PRD Constraints
- [ ] If the product holds personal data: `Data protection stance:` chosen and written to PRD Constraints, and the "not legal advice" boundary stated once
- [ ] If frontend-only: noted in PRD Constraints
- [ ] Design system decision resolved
- [ ] `docs/design-system.md` written (from the user's system, or proposed by you and approved) and referenced in PRD
- [ ] Every feature respects Single Responsibility
- [ ] Dependencies between features documented
- [ ] All features added to `features/INDEX.md` with status "Roadmap"
- [ ] "Next Available ID" updated in INDEX.md
- [ ] App-wide data model sketched to `docs/data-model.md` (entities + relationships + ownership; NO column types/indexes/FKs) and approved by the user
- [ ] App shell decided: more than two top-level areas (or signed-out ≠ signed-in) → an "App Shell & Navigation" feature exists in INDEX; a single-screen tool → deliberately none
- [ ] App shell sketched to `docs/app-shell.md` (areas + layout regions + page pattern + owning feature; NO colors/fonts) and approved by the user
- [ ] If Supabase + `local`: local stack set up in this session (Docker/CLI checked, `supabase start` run, clients wired, local keys handed off) — no bounce to `/verify-setup`. If cloud: the user's setup action handed off clearly
- [ ] Build order recommended
- [ ] User has reviewed and approved PRD and feature map

## Handoff
After user approval:

> "Project setup complete. Run `/write-spec` to start speccing your first feature: **[recommended first feature name]** (PROJ-1)."

For `mode: existing`, say what you recorded and what it buys them — they came in with a working project and should hear what changed and what did not:

> "I've recorded how your project runs, so I check my work against it instead of guessing. Nothing in your code was touched. Run `/write-spec` when you want to plan your next feature: **[name]** (PROJ-1)."

If the project uses Supabase **local** and you set the stack up above, confirm it rather than sending them back:
> "Your local Supabase is running and `.env.local` is wired, so the first feature can build against a real database right away."

If the strategy is cloud (or Docker/CLI was missing so setup couldn't finish), point to the one remaining action instead.

## Git Commit
```
feat: Initialize project — PRD and feature map

- Created docs/PRD.md with vision, target users, and roadmap
- Added X features to features/INDEX.md
```