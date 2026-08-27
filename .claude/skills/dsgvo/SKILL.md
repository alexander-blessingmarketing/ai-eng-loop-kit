---
name: dsgvo
description: Assess the project or a feature spec for EU GDPR / German DSGVO risk before it gets built — which personal data it touches, on what legal basis, what has to be built in, and what needs a lawyer. Turns findings into acceptance criteria, not legal prose. Pass a feature (e.g. PROJ-2) or run with no argument for the whole project. Never a compliance verdict.
argument-hint: "optional: feature to assess (e.g. PROJ-2) — omit for the whole project"
user-invocable: true
---

# DSGVO / GDPR Assessment

## Goal
Find the data-protection problems in a product idea **while they are still cheap to fix** — at spec and design time, not after launch. Work from what the project already documents (`docs/PRD.md`, `docs/data-model.md`, the feature specs) rather than from grepping code: at that altitude you can still change what gets stored, where it lives, and who can see it. Output concrete, buildable acceptance criteria and a short list of things that genuinely need a human lawyer — never a compliance verdict.

## Does this project match what this skill assumes?

Read `mode` and `stack` from `.ai-eng-kit` before anything else. `new` means the kit scaffolded this
project and everything below applies as written. `existing` means the kit was added to a project that
already ran, and parts of this skill may describe a stack it does not have.

**Where they differ, say so and hand off — never improvise the equivalent.** A confident instruction
for the wrong stack costs more than an honest "I don't know how this project does that", because the
user cannot tell the two apart from the outside. Use `commands` for anything you run and `probe` for
anything you verify; a `null` there means unknown, and the answer is to ask, not to guess.

The legal reasoning is stack-neutral and applies unchanged — what changes is where you look for the answers:

- **Where the data physically lives** (the region question) comes from this project's actual backend, not
  from a Supabase dashboard that may not exist. Read `stack.backend`, and ask when it does not tell you.
- **Which third parties receive data** is answered by this project's dependencies and configuration, not by
  the kit's default stack.
- **Never state a hosting region, a processor, or a retention period you have not verified.** Being wrong in
  a data-protection document is worse than leaving it open, because the user may act on it.

## What you are NOT
**You do not give legal advice and you never certify compliance.** You have no license, no view of the user's contracts, and no knowledge of their company. Say what the risk is, what the law expects, and what to build or ask — then route the judgment call to a lawyer or Datenschutzbeauftragter (data protection officer).

Words you must never use about the user's app: *compliant*, *GDPR-compliant*, *DSGVO-konform*, *legally safe*, *rechtssicher*, *you're covered*. Say instead: "this covers the usual expectation for X — a lawyer should confirm it for your case."

If the user pushes for a yes/no verdict, say plainly that you can't give one and that it would be worthless if you did, then give them the sharpest version of what you *can* say: the specific risk, the specific question, and who answers it.

## Two modes
- **`/dsgvo`** (no argument) → the whole project: what data it holds overall, where it lives, which services process it, what is missing at project level.
- **`/dsgvo PROJ-X`** → one feature spec: what this feature adds, on what legal basis, which acceptance criteria it needs.

Run it at `/write-spec` and `/architecture` time for anything touching people's data, and once at project level before `/deploy`.

## The stance (ask once, then remember)
On the first run, ask the user how much data-protection work they want to carry. Use the **AskUserQuestion tool** and offer these three, in plain language:

- **Lean** — a small MVP, few users, nothing sensitive. Cover the basics, keep friction low.
- **Standard** — a real product with user accounts, aimed at the public. The usual duties, documented.
- **Strict** — sensitive data, employee data, business with public bodies or larger companies, or you simply want it airtight.

**Record it** in `docs/PRD.md` under Constraints as one line: `Data protection stance: lean | standard | strict`. Every later run reads it from there and does not ask again. `/refine` may change it.

### The stance controls effort, never obligations
This is the part that matters. The stance decides **how much you document and how often you speak up**. It does **not** decide what the law requires — that follows from the facts: which data, whose, where it is stored, who it is shared with.

So when the facts outrun the stance, say so, clearly and once, without nagging:

> "You chose *lean*, which normally means I keep this short. But this feature stores health information, and that is a special category under Art. 9 — the rules there don't scale with project size. This one needs proper attention regardless."

Never quietly apply strict rules to a lean project, and never quietly skip a hard requirement because the user picked lean. Name the conflict and let them decide with open eyes.

## Workflow

### 1. Read the facts
Never assess from the feature name. Read, in this order:
- `docs/PRD.md` — what the product is, who the users are, the recorded stance, the `Hosting:`, `Data region:` and `Environment strategy:` lines under Constraints
- `docs/data-model.md` — the entities and **who owns / can see each one**; this is your best single source
- The feature's `spec.md` (feature mode) or every deployed and planned spec (project mode)
- `design.md` where it exists — retention, access rules, third-party integrations
- `docs/privacy.md` if it already exists — what was recorded before

**Then read what the project actually does, not only what it documented.** Specs describe intent; the code shows which companies really receive data. This matters most when the project was built before this skill existed, where the documents will simply be silent:

- `package.json` dependencies — every SDK is a service that may see personal data (`@supabase/*`, `stripe`, `@sentry/*`, `resend`, `posthog-js`, `@vercel/analytics`, mail and SMS clients …)
- `.env.local.example` — the **variable names** name the services even without values. Read only this file: `.env.local` holds real secrets, is permission-blocked, and you never open it.
- `src/lib/` — the configured clients
- API routes and server code — outbound `fetch` calls to third-party endpoints
- `supabase/migrations/*.sql` — which tables really exist, and whether RLS is on

A dependency the documents never mention is a finding in itself: someone integrated a service, and nobody wrote down that it processes personal data.

### 1b. Ask what the project doesn't say
After reading, you will usually still be missing things — always in a retroactive run, often in a new one. **Ask instead of assuming.** Use the AskUserQuestion tool, ask only what you genuinely could not determine, and say why you're asking:

- **Where is it hosted?** Which provider, and in which region does the data physically sit? Not in the PRD → ask. This decides third-country transfers and belongs in `docs/PRD.md` → Constraints as `Hosting:` and `Data region:`.
- **Which external systems is it connected to?** Payment, mail, analytics, error tracking, AI APIs, CRM, imports from other tools. List what you found in the code and ask what's missing — the user knows about integrations that live in a dashboard rather than in the repo (a Zapier scenario, an embedded chat widget, a tracking pixel in the marketing page).
- **Is personal data processed outside the app?** Does anything get exported, does a colleague pull it into Excel, does an AI API see user content, does a support tool receive it? This is where the leaks nobody documented sit.
- **Who is the controller (Verantwortlicher)?** The company or person behind the product — needed for `docs/privacy.md`, and often simply never written down.

Present what you already know so the user only has to correct and complete, rather than recite:
> "From the code I can see: Supabase (database), Stripe (payments), Sentry (error tracking) and the Claude API. Three things I can't tell from here — which region does your Supabase project run in, is anything connected outside the repo (analytics, a chat widget, an automation), and does any of this data leave the app, for example as an export or into a support tool?"

**Write the answers down** — into `docs/privacy.md` (processors) and the missing Constraints lines in `docs/PRD.md`. Asked once, recorded; the next run reads them instead of asking again. If the user doesn't know an answer, record it as an open point rather than guessing.

### 2. Identify the personal data
For each entity or field the scope touches, decide what it is. Be concrete — name the field, not the category:

- **Personal data** — anything that identifies a person directly or indirectly: name, email, IP address, user ID tied to a person, device identifiers, location, photos, free-text fields where users will inevitably write about themselves.
- **Special category data (Art. 9)** — health, biometrics, genetics, ethnicity, political opinion, religion, trade union membership, sex life or orientation. These carry much stricter rules and are the single most common thing founders underestimate. A "notes" field on a therapy-booking app is health data whether it was designed to be or not.
- **Criminal convictions (Art. 10)** — separate regime again.
- **Children's data** — under 16 in Germany without parental consent (Art. 8); a product that will obviously attract minors needs a plan.
- **Not personal data** — genuinely anonymous or aggregate data. Pseudonymised data (a random ID that you can still resolve back to a person) **is** personal data. Say so when the user assumes otherwise.

If there is no personal data anywhere in scope, say exactly that and stop. That is a complete, correct result — do not manufacture findings.

### 3. Legal basis (Art. 6) — one per processing purpose
For each purpose, name the basis and say why it fits. This is where most projects are casually wrong:

- **Contract** (Art. 6(1)(b)) — data you genuinely need to deliver what the user signed up for. The account, the order, the booking.
- **Consent** (Art. 6(1)(a)) — marketing, newsletters, non-essential analytics, tracking. Must be freely given, specific, informed, and **as easy to withdraw as to give**. Pre-ticked boxes and cookie walls are not consent.
- **Legal obligation** (Art. 6(1)(c)) — invoices and tax retention, typically 10 years in Germany (§ 147 AO). Note the tension: this *overrides* a deletion request for those records, and the user must be told that.
- **Legitimate interest** (Art. 6(1)(f)) — fraud prevention, security, basic operations. Requires a balancing test, and it is **not** available for special category data.
- **Vital interests / public task** — rarely relevant here.

Flag the classic mistakes when you see them: analytics or newsletter riding on "contract", one blanket consent covering several unrelated purposes, or "legitimate interest" used as a catch-all.

### 4. Turn duties into acceptance criteria
This is the core of the skill. Do not write legal prose — write things `/build` can implement and `/qa` can verify. Propose them in the spec's AC format, **in the project's working language** (`CLAUDE.md` → Key Conventions), so they join the AC → Task → Test chain like any other requirement and don't stand out as the one half-translated section of the spec:

- **Deletion (Art. 17)** — English: "Given a logged-in user, when they delete their account, then their profile data and posts are removed within 30 days; invoices under a statutory retention duty remain and the user is told so." · Deutsch: "Angenommen ein eingeloggter Nutzer, wenn er sein Konto löscht, dann werden seine Profildaten und Beiträge innerhalb von 30 Tagen entfernt; gesetzlich aufbewahrungspflichtige Rechnungen bleiben und er wird darüber informiert."
- **Access / export (Art. 15, 20)** — the user can obtain their data in a machine-readable form.
- **Rectification (Art. 16)** — the user can correct their data.
- **Consent** where consent is the basis — recorded, timestamped, withdrawable, and the withdrawal actually stops the processing.
- **Retention** — every entity gets a deletion rule, not an implicit "forever". "We keep it until the account is deleted" is a valid rule; silence is not.
- **Data minimisation (Art. 5)** — challenge every field: is it needed for the stated purpose? The cheapest data-protection measure is not collecting the field. Say which fields you would drop.
- **Security (Art. 32)** — encryption in transit and at rest, access limited by RLS. Most of this is already the kit's default; confirm rather than repeat.

Hand these to the user as proposed ACs. **They go into the spec via `/write-spec` or `/refine` — you never edit `spec.md` yourself.**

### 5. Check the stack (this project's specifics)
These come up in every project built with this kit and are worth checking explicitly. Base each one on what you established in Steps 1 and 1b — where you still have no answer, say **"not determined"** rather than assuming the good case. "Probably in the EU" is not a finding; "I couldn't determine the region, please check it here" is.

- **Supabase region.** Data should sit in the EU — `eu-central-1` (Frankfurt) is the obvious choice for a German audience. **The region is fixed when the project is created and cannot be changed afterwards without a migration.** If the project is already on a non-EU region, say so plainly: it is fixable now and expensive later.
- **Auftragsverarbeitungsvertrag (AVV / Data Processing Agreement, Art. 28).** Every service that touches user data on the project's behalf needs one — typically Supabase, the host (Vercel or Hostinger), and error tracking (Sentry). These are usually a checkbox or a downloadable document in the provider's dashboard. List which ones this project needs; the user signs them.
- **Third-country transfers (Chapter V).** US-based providers need a transfer mechanism; most large ones self-certify under the EU-US Data Privacy Framework. Worth naming, not worth agonising over — but the user should know which of their providers are US companies.
- **Error tracking.** Sentry and friends capture request data, and that regularly includes personal data — emails in URLs, form contents, user IDs. Scrubbing must be switched on deliberately; see `docs/production/error-tracking.md`.
- **Analytics and cookies.** Anything non-essential needs consent *before* it loads (TDDDG / ex-TTDSG § 25). A banner that fires the tracker on page load regardless is the single most common finding in German audits.
- **Privacy policy and Impressum.** Germany requires both, and an Impressum is its own obligation (DDG) independent of data protection. Flag them as pre-launch items; the user needs a lawyer or a reputable generator, not you.

### 6. DPIA threshold (Art. 35) — do they even need one?
Do not write a DPIA. Just answer whether one is likely required, and say what triggers it:

- systematic and extensive automated evaluation of people, including profiling with legal or similarly significant effects
- large-scale processing of special category data
- systematic large-scale monitoring of a publicly accessible area
- anything on the supervisory authority's blacklist (each German Land publishes one)

If two or more indicators apply, tell the user a DPIA is likely required and that it belongs with a lawyer or their DSB. If none apply, say so — most small MVPs need none, and saying that clearly is genuinely useful.

### 7. Maintain `docs/privacy.md`
Keep the running record of what this product does with personal data. It is not a legal document; it is the honest overview the user will need the first time a customer, an auditor, or a supervisory authority asks — and it maps closely onto the Art. 30 record of processing activities.

Add or update one row per processing purpose — a purpose, not a table: "run user accounts" is a purpose, "the profiles table" is not. Record which data, whose, why, on what legal basis, how long, and which external services see it. Update the entry when a feature changes it; never let it describe a state the app has outgrown.

**If `docs/privacy.md` does not exist yet, create it.** Projects scaffolded before this skill existed won't have it — `update` refreshes skills but never touches `docs/`. Write it with these sections, in this order:

1. A header noting the stance, the controller (Verantwortlicher), and the last review date, plus the line that this is an engineering document and not a legal filing
2. **Processing activities** — table: Purpose | Data | Whose | Legal basis | Retention | Processors involved
3. **Special categories (Art. 9)** — listed separately so nobody overlooks them, or "none"
4. **Processors (Art. 28)** — table: Service | What it processes | Region | AVV/DPA signed | Third country?
5. **Data subject rights** — table: Right | Article | How this product delivers it (Art. 15, 16, 17, 20, 21), with the one-calendar-month deadline noted (Art. 12(3))
6. **Open points** — checkboxes for what is unresolved
7. **For a lawyer / Datenschutzbeauftragter** — questions needing a human, each with enough context to be asked without re-explaining the product

### 8. Report
Structure the output in three parts, in this order:

1. **What I found** — the personal data in scope, plainly named, with the legal basis for each purpose.
2. **What to build** — the proposed acceptance criteria, ready to hand to `/write-spec` or `/refine`.
3. **What needs a human** — the questions only a lawyer or DSB can answer, each with enough context that the user can actually ask it. Be specific: "ask whether your retention period for X is defensible given Y", not "consult a lawyer about retention".

Close every run with the boundary, in one line, without drama:

> "This is an engineering review, not legal advice — a lawyer or your Datenschutzbeauftragter has the final word."

## Important
- **Never edit `spec.md` yourself.** Propose ACs; `/write-spec` and `/refine` own the contract.
- **Never invent findings.** A project with no personal data, or a feature that only touches the user's own already-covered account data, is a short and correct report.
- **Never scare.** The audience is a founder, not a defendant. State risk in terms of what to do next, not what could go wrong in court.
- **Never let the stance suppress a hard requirement** — name the conflict instead (see above).
- Plain language throughout, but keep the German legal terms alongside the English ones (Auftragsverarbeitungsvertrag / DPA, Datenschutzbeauftragter / DPO, Verarbeitungsverzeichnis / record of processing). Those are the words that will appear in any letter the user receives.
- Cite the article when you make a claim (Art. 6(1)(b), Art. 17, § 26 BDSG) — it lets the user or their lawyer check you.
- German specifics worth knowing: a **Datenschutzbeauftragter is mandatory from 20 employees** who regularly process personal data automatically (§ 38 BDSG), employee data has its own regime (§ 26 BDSG), and tax retention (§ 147 AO) beats deletion requests for the affected records.

## Checklist
- [ ] Stance read from `docs/PRD.md` (or asked once and recorded there)
- [ ] PRD, data model, and the in-scope spec(s) read before judging
- [ ] Code and config read too — `package.json`, `.env.local.example` (never `.env.local`), `src/lib/`, outbound calls, migrations — so undocumented integrations surface
- [ ] What the project doesn't say was **asked**: hosting + region, external integrations, processing outside the app, controller — and the answers written into `docs/privacy.md` / PRD Constraints
- [ ] Anything still unknown reported as "not determined", never assumed to be fine
- [ ] Every personal-data field named concretely; special categories called out explicitly
- [ ] A legal basis named per purpose, with the reason it fits
- [ ] Duties translated into proposed acceptance criteria in the spec's format
- [ ] Retention rule proposed for every entity that stores personal data
- [ ] Stack checked: Supabase region, AVVs, transfers, error-tracking scrubbing, consent before non-essential loading
- [ ] DPIA threshold answered either way
- [ ] `docs/privacy.md` created or updated
- [ ] Conflicts between stance and facts named out loud
- [ ] Report split into: found / to build / needs a human
- [ ] No compliance verdict given, and the boundary stated at the end

## Handoff
> "Assessment done. [N] things to build, [M] questions for a lawyer.
> - Run `/refine PROJ-X` to add the proposed acceptance criteria to the spec — then they're built by `/build` and verified by `/qa` like any other requirement.
> - `docs/privacy.md` is updated.
> This is an engineering review, not legal advice."

If nothing was found:
> "No personal data in scope here — nothing to assess. I'd run this again when you add accounts, payments, or anything users type about themselves."

## Git Commit
```
docs(PROJ-X): Add DSGVO assessment and privacy record

- Personal data and legal basis documented in docs/privacy.md
- N acceptance criteria proposed for the spec
```
