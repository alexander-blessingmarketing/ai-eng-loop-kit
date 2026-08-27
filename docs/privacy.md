# Privacy Record — what this product does with personal data

> The honest overview of which personal data this product processes, why, and for how long.
>
> - Created and kept current by `/dsgvo`, one entry per processing purpose.
> - Grows with the product: when a feature changes what is stored, its entry changes too.
> - **Altitude:** purposes, legal bases, retention, and who else sees the data. Field-level detail lives in `docs/data-model.md` and the feature designs.
>
> This maps closely onto the *Verzeichnis von Verarbeitungstätigkeiten* (record of processing activities, Art. 30 GDPR) — but it is an engineering document, not a legal filing. A lawyer or your Datenschutzbeauftragter (data protection officer) has the final word on whether it is complete for your situation.

**Data protection stance:** _lean | standard | strict — set in `docs/PRD.md` → Constraints_
**Controller (Verantwortlicher):** _your company / your name and address — the legal entity behind the product_
**Last reviewed:** _YYYY-MM-DD_

---

## Processing activities

_One row per purpose, not per table. "Run user accounts" is a purpose; "the profiles table" is not._

| Purpose | Data | Whose | Legal basis | Retention | Processors involved |
|---------|------|-------|-------------|-----------|---------------------|
| _Run user accounts_ | _Email, password hash, display name_ | _Registered users_ | _Art. 6(1)(b) contract_ | _Until account deletion_ | _Supabase (EU)_ |
| _..._ | _..._ | _..._ | _..._ | _..._ | _..._ |

## Special categories (Art. 9)

_Health, biometrics, genetics, ethnicity, political opinion, religion, trade union membership, sex life or orientation. These carry much stricter rules — usually explicit consent. List them separately so nobody overlooks them, or write "none"._

- _none_

## Processors (Auftragsverarbeiter, Art. 28)

_Every external service that touches personal data on your behalf. Each needs a data processing agreement (AVV / DPA) — normally a checkbox or a downloadable document in the provider's dashboard._

| Service | What it processes | Region | AVV / DPA signed | Third country? |
|---------|-------------------|--------|------------------|----------------|
| _Supabase_ | _All application data_ | _eu-central-1 (Frankfurt)_ | _☐_ | _US company, EU hosting_ |
| _Vercel_ | _Requests, logs_ | _..._ | _☐_ | _..._ |
| _Sentry_ | _Error reports (scrubbed)_ | _..._ | _☐_ | _..._ |

## Data subject rights — how they are served

_Which part of the app actually delivers each right. "By email, manually" is a valid answer for a small product; leaving it blank is not._

| Right | Article | How this product delivers it |
|-------|---------|------------------------------|
| Access / copy | Art. 15 | _..._ |
| Rectification | Art. 16 | _..._ |
| Erasure | Art. 17 | _..._ |
| Portability | Art. 20 | _..._ |
| Objection | Art. 21 | _..._ |

> All of these must be answered within **one calendar month** of the request (Art. 12(3)), extendable by two further months for complex cases if the person is told within the first month.

## Open points

_What is still unresolved, and who resolves it. `/dsgvo` adds items here; they leave when they are actually done._

- [ ] _e.g. AVV with Sentry not yet signed_
- [ ] _e.g. Retention period for uploaded files never decided_

## For a lawyer / Datenschutzbeauftragter

_Questions that need a human. Keep the context with each question so it can be asked without re-explaining the product._

- _e.g. Our free tier keeps analytics data for 24 months on legitimate interest — is that defensible for a B2C product with no login requirement?_

---

_Run `/dsgvo` to create the first version of this record, and again whenever a feature changes what personal data the product holds._
