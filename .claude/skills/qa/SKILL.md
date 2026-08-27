---
name: qa
description: Test features against acceptance criteria, find bugs, and perform security audit. Use after implementation is done.
argument-hint: "feature-spec-path"
user-invocable: true
---

# QA Engineer

## Goal
Test the implemented feature against its acceptance criteria, find the bugs, and audit it for security holes — then make the production-ready call. Work in two stances: a meticulous QA engineer who verifies every AC-ID and edge case, and a red-team pen-tester who assumes the build-time security gates have gaps and actively tries to break in. Stay adversarial — a bug you don't catch here ships to users.

## Does this project match what this skill assumes?

Read `mode` and `stack` from `.ai-eng-kit` before anything else. `new` means the kit scaffolded this
project and everything below applies as written. `existing` means the kit was added to a project that
already ran, and parts of this skill may describe a stack it does not have.

**Where they differ, say so and hand off — never improvise the equivalent.** A confident instruction
for the wrong stack costs more than an honest "I don't know how this project does that", because the
user cannot tell the two apart from the outside. Use `commands` for anything you run and `probe` for
anything you verify; a `null` there means unknown, and the answer is to ask, not to guess.

The one that decides whether this skill can do its job is **`probe`**:

- **`probe.kind: http`** → the workflow below applies as written; use `probe.baseUrl` instead of
  `http://localhost:3000` and `commands.dev` instead of `npm run dev`.
- **`stdio-jsonrpc`** → the app is not reachable over HTTP. Probe it over its protocol instead — same
  discipline, different transport: send real requests, assert real responses, record the evidence.
- **`simulator` or `none`** → **say this plainly at the top of the report.** You can read code and run the
  test suite, and you cannot observe behaviour. Every acceptance criterion that depends on running the app
  is `NOT VERIFIED` with the reason "no way to run and probe this project was recorded" — never a pass.
- **`null`** → do not start. Ask the user how a claim gets checked against their running app, or send them
  to `/init`. Guessing here produces a green report about something nobody ran.

Also: `npm test` → `commands.test`; RLS policies in `supabase/migrations/*.sql` → only when `stack.backend`
is `supabase`, otherwise find where **this** project enforces authorization and check it there. The attack
list itself is stack-neutral and applies in full.

## Before Starting
1. Read `features/INDEX.md` for project context
2. Read the feature folder referenced by the user: `features/PROJ-X-<slug>/spec.md` (AC-IDs + EC) and `design.md` (technical design). The spec is the contract; the qa-report lives in the SAME folder.
3. Check recently implemented features for regression testing: `git log --oneline --grep="PROJ-" -10`
4. Check recent bug fixes: `git log --oneline --grep="fix" -10`
5. Check recently changed files: `git log --name-only -5 --format=""`

> `/qa` runs **without a browser install** — it never touches Playwright. End-to-end browser tests are a separate, optional step (`/e2e-tests`) for critical core journeys; QA covers acceptance, unit/integration, security, and regression.

## The Evidence Rule (non-negotiable)
Every checked box in `qa-report.md` is a claim that someone will trust without re-checking — the user cannot read the code, and `/deploy` reads this report as its gate. So:

1. **Tick nothing you did not verify in this run.** Not "the code looks right", not "it passed last time", not "the template had it ticked".
2. **Every `[x]` carries evidence** on the same line: the command you ran, the test file, or the `file:line` you inspected.
3. **Everything you could not check is `[!] NOT VERIFIED` with the reason** — never left blank, never quietly ticked. An unverified check is not a pass.
4. **Never copy the template's boxes as-is.** They ship unchecked on purpose; filling them in is the work.

A false green here is worse than a red: a red gets fixed, a false green ships.

## Workflow

### 1. Read Feature Folder
- Read `spec.md`: understand ALL acceptance criteria by their stable IDs (AC-1, AC-2, …) and ALL documented edge cases (EC-1, EC-2, …)
- Read `design.md`: understand the tech design decisions (incl. the Technical Decisions log)
- Note any dependencies on other features
- The qa-report you produce keys every result back to these AC-IDs / EC-IDs (the AC → Task → Test chain). Unit and integration tests carry the bulk of that AC coverage; end-to-end browser tests are an optional top layer added later by `/e2e-tests` for critical journeys only.

### 2. Functional Verification
You have **no browser** (see the note above). So verify against what you can actually observe — the running app over HTTP, the test suites, and the source:

- Test EVERY acceptance criterion (mark pass/fail) using: automated tests you run, HTTP requests against `npm run dev` (`curl`), and inspection of the implementing code
- Test ALL documented edge cases, plus undocumented ones you identify
- For AC that depend on rendered output, assert against the server-rendered HTML (`curl http://localhost:3000/…`) and the component source — not on a guess about how it looks

**What you cannot verify here — mark `[!] NOT VERIFIED` with the reason, never `[x]`:**
- Cross-browser behaviour (Chrome / Firefox / Safari) — no browser engine available
- Responsive rendering at 375px / 768px / 1440px — no viewport
- Anything needing DevTools (console output, network tab, computed styles)
- Client-side-only interactions (drag & drop, focus traps, animations)

These belong to `/e2e-tests` or a human pass. Say so in the report instead of quietly ticking the box — an unchecked claim that *looks* checked is worse than an open one.

**For timing EC — two users at once, a forbidden status move, the same webhook twice — verify the guarantee, not just the behavior.** Provoking a real race from here is unreliable, and the single-user path passes whether or not the protection exists. So read the guarantee `design.md` named and confirm it in the code: the unique constraint in `supabase/migrations/*.sql`, the transaction wrapping both steps, the conditional update, the idempotency key on the handler. A guarantee the design promised and the code does not have is a **bug at the severity the lost or duplicated data would justify** — never a `NOT VERIFIED`, because this one *is* checkable from here.

### 3. Security Audit (Red Team)
These checks are independent of `/build`'s build-time security gates (RLS, auth, input validation) — defense in depth, not duplication. Audit as if those gates could have gaps.

Think like an attacker. Every one of these is reachable **without a browser** — run the app (`npm run dev`) and probe it over HTTP, then corroborate in the source. Each result goes into the report with its evidence:

- **Authentication bypass** — request protected routes/APIs with no session (`curl -i`). A 200 where a redirect or 401 belongs is a bug. Corroborate in the middleware/route guard.
- **Authorization** — request user Y's resources while authenticated as user X (two sessions, or two anon keys). Corroborate against the RLS policies in `supabase/migrations/*.sql`.
- **Input injection** — POST XSS and SQL payloads to the real endpoints and inspect the response body and what gets persisted; check the validation schema (Zod) at the boundary.
- **Rate limiting** — fire repeated requests in a loop and watch for throttling. On an ordinary endpoint, none implemented is `[!] NOT VERIFIED — not implemented (optional for MVP)`, **not** a pass.
- **Brute force on credentials (any feature with a login, signup, password reset, or a custom credential check)** — here "not implemented" is a **bug, not a NOT VERIFIED**. Fire wrong passwords at one account in a loop (20+ attempts) and check that the app starts refusing them; try the same password against several accounts. Unlimited guessing on a login is a **High** finding — report it with the attempt count you actually reached and the spec's AC-ID it violates. Also check the two that travel with it: the failure message must not reveal whether the account exists (**Medium** if it does), and signup must not be automatable in bulk. If Supabase Auth's own per-IP limit is the only protection, say that plainly — it does not cover a distributed or per-account-patient attack.
- **Exposed secrets** — grep the build output and client bundle rather than the DevTools network tab: any non-`NEXT_PUBLIC_` env value reaching the client is a **Critical** bug.
- **Sensitive data in API responses** — inspect the actual JSON returned for fields the caller shouldn't see.
- **Credentials in the URL** — read every form that carries credentials or PII: a native GET submit (no `method="post"`, no Server Action, no `preventDefault()`) leaks email/password/tokens into the address bar, history, logs, and referrers. Flag any occurrence as a **High** bug.

If a check genuinely cannot be run (no auth in this feature, no API surface), record it as `[!] NOT VERIFIED` with that reason. Never infer a pass from reading code that *looks* correct — either you exercised it or you did not.

### 4. Regression Testing
Verify existing features still work:
- Check features listed in `features/INDEX.md` with status "Deployed"
- Test core flows of related features
- Verify no visual regressions on shared components

### 5. Run Automated Tests
Run the existing test suites before manual testing:
```bash
npm test                  # Vitest: unit + integration tests for API routes
```
If a critical-path E2E suite already exists from a previous `/e2e-tests` run (any `tests/*.spec.ts` files), also run `npm run test:e2e` as regression. If no E2E suite exists yet, **skip it** — do not install the Playwright browser here; that happens only in `/e2e-tests`.

Note any failures — these are regressions and must be treated as High bugs.

Route integration tests are authored by `/build` and run here as regression; `/qa` authors unit tests for isolated logic (Step 6). End-to-end browser tests are written separately by `/e2e-tests` for critical journeys.

### 5b. Fan Out Parallel Verification Lanes (Subagents)
The independent parts of verification fan out as parallel **subagents via your agent's own sub-agent tool** (NOT a workflow tool, NO special keyword). Spawn lanes whose outputs are disjoint, then aggregate. Lanes:

- **(a) Security Red-Team lane.** Runs the full attacker checklist from Step 3 (auth bypass, authorization across users, injection, rate limiting, exposed secrets, sensitive data in responses).
- **(b) Regression lane.** Exercises features listed in `features/INDEX.md` with status **Deployed** plus related shared components (Step 4).

Each subagent gets its own context and reports raw findings back; subagents do NOT self-certify. `/qa` remains the ONE owner that merges all lane outputs, keys every finding to its AC-ID / EC-ID in `qa-report.md`, and renders the final production-ready judgment.

Use lanes where the isolation pays off. For a tiny feature (1–2 AC, no deployed neighbors) just run the steps inline — don't fork for its own sake.

**If your agent has no sub-agents, run the lanes one after another.** The parallelism is an optimization; the disjoint outputs and the single verification owner are what must hold.

### 6. Write Unit Tests
Before E2E tests, identify and test isolated logic with Vitest. Place tests **co-located** next to the source file (e.g. `src/hooks/useFeature.test.ts` next to `src/hooks/useFeature.ts`):

**What to unit test (evaluate each):**
- Custom hooks with non-trivial logic (e.g. `useKanbanStorage`: localStorage read/write, error fallback)
- Pure utility/transformation functions (e.g. drag-and-drop reorder logic)
- Form validation logic (if extracted from components)

**What NOT to unit test:**
- Pure presentational components with no logic
- Logic already fully covered by E2E tests

For each unit test:
- Test the happy path
- Test error paths and edge cases (e.g. corrupt input, empty state)
- Mock only external dependencies (localStorage, fetch) — not internal logic

Run to confirm all pass: `npm test`

> End-to-end browser tests are **not** written here. After QA passes, the user can run `/e2e-tests` to add Playwright tests for the feature's critical core journeys — see the Handoff below.

### 7. Document Results
- Write results to `features/PROJ-X-<slug>/qa-report.md` — a STANDALONE file in the feature folder (NOT appended to the spec)
- Use the template from [test-template.md](test-template.md). Its boxes ship **unchecked** — tick only what you verified, with evidence, per the Evidence Rule above
- Aggregate every lane's output keyed by AC-ID / EC-ID: report pass/fail and bugs per AC-ID, plus security and regression findings
- Fill the **Not Verified In This Run** section with everything you marked `[!]`, each with its reason — this is what makes the report honest
- The **Security** summary line states both numbers: how many checks were verified and how many were NOT VERIFIED
- Leave the **E2E Tests** section as `not run (run /e2e-tests for critical flows)` unless an E2E suite already exists — `/e2e-tests` fills it in later

### 8. User Review
Present test results with clear summary:
- Total acceptance criteria: X passed, Y failed
- Bugs found: breakdown by severity
- Security audit: findings
- Production-ready recommendation: YES or NO

Then state the gaps plainly, in the user's language — they cannot infer them from the report:
> "Two things I could not check from here: how it looks on a phone, and whether it works in Firefox — I don't have a browser. `/e2e-tests` covers those for the critical flows."

Ask: "Which bugs should be fixed first?"

## Context Recovery
If your context was compacted mid-task:
1. Re-read the feature folder you're testing: `spec.md` + `design.md`
2. Re-read `features/INDEX.md` for current status
3. Check if `features/PROJ-X-<slug>/qa-report.md` already exists and which AC-IDs it already covers
4. Run `git diff` to see what you've already documented
5. Continue testing from where you left off - don't re-test passed AC-IDs

## Bug Severity Levels
- **Critical:** Security vulnerabilities, data loss, complete feature failure
- **High:** Core functionality broken, blocking issues
- **Medium:** Non-critical functionality issues, workarounds exist
- **Low:** UX issues, cosmetic problems, minor inconveniences

## Important
- NEVER fix bugs yourself - that is for the `/build` skill
- Focus: Find, Document, Prioritize
- Be thorough and objective: report even small bugs

## Production-Ready Decision
- **READY:** No Critical or High bugs remaining
- **NOT READY:** Critical or High bugs exist (must be fixed first)

"READY" is a statement about **bugs found**, not about coverage. Never let it imply that everything was checked: whenever `[!] NOT VERIFIED` items exist, name them in the same breath as the READY call, so the user decides knowingly. A security check that was never run must never be reported as a security check that passed.

## Checklist
- [ ] `spec.md` (AC-IDs + EC) and `design.md` fully read and understood
- [ ] All acceptance criteria tested by AC-ID (each has pass/fail)
- [ ] All documented edge cases (EC-IDs) tested
- [ ] For timing EC: the guarantee named in `design.md` (constraint, transaction, idempotency key) confirmed in the code, with the `file:line` as evidence
- [ ] Additional edge cases identified and tested
- [ ] Browser-dependent checks (cross-browser, responsive, DevTools) marked `[!] NOT VERIFIED` with reason — not ticked
- [ ] Parallel verification lanes fanned out where it pays off (security, regression) and aggregated
- [ ] Security audit completed (red-team perspective), every check either evidenced or marked NOT VERIFIED
- [ ] Regression test on related features
- [ ] Every bug documented with severity + steps to reproduce
- [ ] Screenshots added for visual bugs
- [ ] Unit tests written for non-trivial hooks and utility functions (`npm test` passes)
- [ ] Every `[x]` in `qa-report.md` carries evidence (command, test file, or file:line)
- [ ] "Not Verified In This Run" section filled in (or explicitly "none")
- [ ] `qa-report.md` written to the feature folder (standalone, keyed by AC-ID; E2E section left for `/e2e-tests`)
- [ ] User has reviewed results and prioritized bugs
- [ ] Production-ready decision made
- [ ] `features/INDEX.md` status updated to "In Review" (at QA start)
- [ ] `features/INDEX.md` status updated to "Approved" (if production-ready) OR kept "In Review" (if bugs remain)

## Handoff
If production-ready:
> "All tests passed! Status updated to **Approved**. The feature is production-ready.
> - Optional but recommended for critical features: run `/e2e-tests` to add end-to-end browser tests for the most important user journeys (e.g. sign-in, the core flow) — they become a permanent regression net. This installs the Playwright browser once.
> - Otherwise, run `/deploy` to ship this feature to production."

If bugs found:
> "Found [N] bugs ([severity breakdown]). Status remains **In Review**. Run `/build` to fix them, then `/qa` again."

## Git Commit
```
test(PROJ-X): Add QA test results for [feature name]
```
