# PROJ-X — Tech Design

> This is the technical design (the HOW) for the feature. Two readers: the PM (must approve) and `/build` (implements against it). No code — but implementation-grade precise: name every field with its type and constraints, state ownership/access, define states explicitly. Plain language, never vague.
> Owner: `/architecture`. The contract (WHAT) lives in `spec.md`; the task list lives in `tasks.md`.
> No status or date fields here — the feature's status lives ONLY in `features/INDEX.md`.

## Component Structure

Show which UI parts are needed as a visual tree:

```
Main Page
+-- Input Area (add item)
+-- Board
|   +-- "To Do" Column
|   |   +-- Task Cards (draggable)
|   +-- "Done" Column
|       +-- Task Cards (draggable)
+-- Empty State Message
```

## Data Model

Describe what information is stored, in plain language (no SQL, no code) — but name every field with its type and constraints, and state who owns each record:

```
Each task has:
- Unique ID
- Title (text, max 200 characters, required)
- Status (one of: To Do, Done)
- Created timestamp
- Belongs to: one user (the creator)

Access: users can only see and change their own tasks.
Stored in: Browser localStorage (no server needed)
```

## Behaviors & Access

_Backend features only — delete this section for frontend-only features._

Spell out the operations and their access rules in plain language. This is the contract `/build` builds the API against:

```
Operations:
- Create a task — any logged-in user; Title required, max 200 chars
- List tasks — returns only the current user's tasks
- Update a task's status — only the task's owner
- Delete a task — only the task's owner

Rejected when: not logged in, or acting on someone else's task.
```

## Dependencies

List only package names with a brief purpose:

- `package-name` — what it does and why we need it

## Technical Decisions

Log every meaningful technical choice and WHY, in plain language a PM can follow —
reasoning, not implementation detail. This is the technical half of the Decision Log
(product decisions live in `spec.md`).

| Decision | Rationale | Alternative considered | Trade-off | Date |
| --- | --- | --- | --- | --- |
| localStorage over Supabase | No user accounts needed; data is device-local | Supabase Postgres | No cross-device sync; data lost if browser storage is cleared | YYYY-MM-DD |

## Open Questions

- [ ] Open technical question that came up during design and still needs an answer
