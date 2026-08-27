# Autonome Benachrichtigung bei echten Blockern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Auto-Mode bei drei eng gefassten Blocker-Kategorien aktiv per `PushNotification` + wiederholtem `CronCreate`-Check anklopfen, statt nur im Chat auf eine unbeantwortete Frage zu warten.

**Architecture:** Zwei reine Dokumentationsänderungen, kein Code, keine Tests im klassischen Sinn. Eine neue, nicht verwaltete Regel-Datei `.claude/rules/autonomous.md` trägt die volle Trigger-/Retry-Logik; ein kurzer `⚠️`-Verweis in `CLAUDE.md` → Key Conventions verankert sie im bestehenden Konventions-Muster des Projekts. "Verifikation" heißt hier: Datei zurücklesen und gegen die Spec-Vorgaben prüfen, nicht pytest.

**Tech Stack:** Markdown-Dokumentation. Zur Laufzeit genutzt werden die harness-eigenen Tools `PushNotification` und `CronCreate` (kein neuer Code, keine neue Abhängigkeit).

**Spec:** `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`

## Global Constraints

- Kein Telegram/Slack/E-Mail-Kanal — nur das eingebaute `PushNotification`-Tool.
- Nur drei Trigger-Kategorien lösen eine Benachrichtigung aus: (1) Setup/Credentials, (2) die in `security.md` → "Code Review Triggers" bereits genannten Pflicht-Freigaben, (3) Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung. Alles andere bleibt beim Auto-Mode-Standard (selbst entscheiden, weitermachen).
- Retry: `PushNotification` + `CronCreate`-Check nach ~3 Minuten, solange der Blocker offen ist; nach 5 Wiederholungen (~15 Min.) auf ein 30-Minuten-Intervall wechseln.
- `.claude/rules/general.md` und `.claude/rules/security.md` sind **managed** (werden von `create-ai-eng-app update` überschrieben) — an ihnen wird nichts geändert.
- Neue Regel-Datei folgt dem bestehenden Präzedenzfall `.claude/rules/instincts.md`: vorhanden, aber nicht in `.ai-eng-kit` → `managed` gelistet.

---

## File Structure

- **Create:** `.claude/rules/autonomous.md` — vollständige Trigger-Definition und Retry-Mechanik. Eigenständig lesbar, referenziert die Spec für die Herleitung.
- **Modify:** `CLAUDE.md` — ein neuer `⚠️`-Bullet unter „Key Conventions", im Stil der dort bereits vorhandenen Abweichungs-Einträge (Branch/PR-Workflow, Lint/Typecheck-Gate, Deploy-Strategie). Kurz, verweist auf `autonomous.md` für die Details statt sie zu duplizieren.

Kein Task hängt vom anderen inhaltlich ab (unterschiedliche Dateien), aber Task 2 zitiert den Dateinamen aus Task 1 — daher in dieser Reihenfolge.

---

### Task 1: `.claude/rules/autonomous.md` anlegen

**Files:**
- Create: `.claude/rules/autonomous.md`

**Interfaces:**
- Produces: die Datei `.claude/rules/autonomous.md` mit den Abschnittsüberschriften `## Wann diese Regel gilt`, `## Was ein echter Blocker ist`, `## Ablauf bei einem echten Blocker`, `## Dedup`, `## Grenzen`, `## Bezug` — Task 2 verweist per Dateipfad darauf, referenziert aber keine internen Anker.

- [ ] **Step 1: Datei schreiben**

Inhalt exakt wie folgt (Write-Tool, neue Datei):

```markdown
# Autonome Benachrichtigung bei echten Blockern

> Nicht von `create-ai-eng-app update` verwaltet — eigene Projektregel, analog zu `.claude/rules/instincts.md`. Verankert über `CLAUDE.md` → Key Conventions.

## Wann diese Regel gilt

Nur während die Session im Auto-Mode läuft (system-seitig als aktiv markiert). Ist der Auto-Mode aus, gilt ausschließlich `.claude/rules/general.md` → „Human-in-the-Loop" — keine aktive Benachrichtigung, nur die Chat-Frage.

## Was ein echter Blocker ist

Genau drei Kategorien lösen eine aktive Benachrichtigung aus:

1. **Setup/Credentials, die nur am Rechner des Menschen gehen** — fehlende `.env.local`-Werte, Docker nicht gestartet, `gh` nicht angemeldet. Bestehende Hand-off-Fälle aus `/verify-setup`, `/init`, `/deploy`.
2. **Die in `.claude/rules/security.md` → „Code Review Triggers" bereits genannten Pflicht-Freigaben** — Änderungen an RLS-Policies, am Auth-Flow, neue Env-Vars. Die Freigabepflicht besteht dort bereits; neu ist nur die zusätzliche aktive Benachrichtigung.
3. **Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung** — erster `/deploy` (legt ein gehostetes Supabase-Projekt mit fixer, nie mehr änderbarer Region an), ein PR wird auf „ready for review" gesetzt, ein Merge nach `main`.

**Kein Trigger:** normale Rückfragen in `/write-spec`, `/architecture` (Abschnitt-für-Abschnitt-Freigabe) und generische Human-in-the-Loop-Checkpoints aus `general.md`. Die entscheidet der Auto-Mode weiterhin selbst — eine begründete Annahme treffen, die Annahme kurz nennen, weiterarbeiten. Würde jede dieser Rückfragen auch eine Benachrichtigung auslösen, würde sie durch die Häufigkeit wertlos.

## Ablauf bei einem echten Blocker

1. Frage/Kontext wie gewohnt im Chat formulieren — die Push-Notification ersetzt den Text nie, sie lenkt nur die Aufmerksamkeit dorthin.
2. `PushNotification` auslösen: knapp, handlungsorientiert, unter 200 Zeichen, kein Markdown. Beispiel: „PROJ-3: RLS-Änderung braucht deine Freigabe, bevor /build weitermacht."
3. `CronCreate` planen (one-shot, `recurring: false`, ca. 3 Minuten später): prüft, ob der Blocker noch offen ist.
   - **Noch offen** → erneut `PushNotification` mit derselben Kernaussage, wieder einen 3-Minuten-Check nachlegen.
   - **Erledigt/beantwortet** → keine weitere Notification, kein neuer Cron-Job.
4. **Backoff:** nach 5 Wiederholungen (~15 Minuten) auf ein 30-Minuten-Intervall wechseln statt weiter im 3-Minuten-Takt zu pushen.
5. Existiert unabhängige Arbeit (z. B. andere `[P]`-Tasks in `/build`, ein anderes Feature), damit weitermachen statt untätig zu warten.

## Dedup

Pro offenem Blocker läuft genau ein Retry-Zyklus — auch wenn derselbe Punkt mehrfach berührt wird (z. B. durch mehrere parallele `[P]`-Tasks). Keine zweite Notification für einen Blocker, der schon einen laufenden Zyklus hat.

## Grenzen

- `CronCreate`-Jobs sind session-only: Sie laufen nur, solange diese Claude-Code-Session offen ist. Schließt der Nutzer das Terminal, verfällt der Retry-Mechanismus mit — keine Persistenz über die Session hinaus.
- Handy-Push nur, wenn Remote Control verbunden ist; sonst nur Desktop-Notification.

## Bezug

Vollständige Herleitung und Alternativen-Abwägung: `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`
```

- [ ] **Step 2: Zurücklesen und gegen die Spec prüfen**

Mit dem Read-Tool `.claude/rules/autonomous.md` erneut lesen und gegenprüfen:
- Alle drei Trigger-Kategorien aus der Spec sind wortgleich in Bedeutung enthalten (Setup/Credentials, Code-Review-Triggers-Verweis, Account-/Kosten-Aktionen mit den drei Beispielen: `/deploy`, „ready for review", Merge nach `main`).
- Der 3-Minuten-Retry und der 15-Minuten-Backoff auf 30 Minuten sind enthalten.
- Der Verweis auf die Spec-Datei ist vorhanden und der Pfad stimmt.

Erwartet: alle drei Punkte treffen zu. Fehlt einer, Step 1 korrigieren und wiederholen.

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/autonomous.md
git commit -m "docs: add autonomous notification rule for genuine blockers"
```

---

### Task 2: `⚠️`-Verweis in `CLAUDE.md` → Key Conventions ergänzen

**Files:**
- Modify: `CLAUDE.md` (Abschnitt „## Key Conventions")

**Interfaces:**
- Consumes: Dateipfad `.claude/rules/autonomous.md` aus Task 1 (nur als Textverweis, keine Code-Schnittstelle).

- [ ] **Step 1: Aktuellen Stand von `CLAUDE.md` lesen**

Mit dem Read-Tool den Abschnitt „## Key Conventions" öffnen und den exakten Text des letzten `⚠️`-Bullets vor dem Bullet „**shadcn/ui first:**" notieren (das ist die Einfügestelle — direkt danach, vor „shadcn/ui first").

- [ ] **Step 2: Bullet einfügen**

Mit dem Edit-Tool den folgenden Block direkt vor dem Bullet „- **shadcn/ui first:** NEVER create custom versions of installed shadcn components" einfügen:

```markdown
- **⚠️ Im Auto-Mode: bei echten Blockern aktiv anklopfen, nicht nur im Chat warten.**
  Läuft die Session im Auto-Mode, entscheidet der Agent die meisten Rückfragen selbst und macht weiter. Bei drei eng gefassten Fällen reicht das nicht — fehlende Credentials/Setup, die in `.claude/rules/security.md` bereits geforderten Pflicht-Freigaben (RLS, Auth-Flow, neue Env-Vars), Account-/Kosten-Aktionen mit externer Wirkung (erster Deploy, PR ready for review, Merge nach main). Ist der Nutzer dabei nicht am Rechner, fällt eine unbeantwortete Chat-Frage sonst nicht auf.

  Volle Trigger- und Retry-Logik (Push-Benachrichtigung + wiederholter 3-Minuten-Check per `CronCreate`, Backoff auf 30 Minuten nach 15 Minuten) steht in `.claude/rules/autonomous.md` — nicht hier, weil diese Datei **managed** ist und bei `create-ai-eng-app update` überschrieben wird. `autonomous.md` ist wie `instincts.md` eine eigene, nicht verwaltete Datei.
```

- [ ] **Step 3: Zurücklesen und Struktur prüfen**

Mit dem Read-Tool `CLAUDE.md` erneut lesen: der neue Bullet steht zwischen dem vorherigen `⚠️`-Bullet-Block und „shadcn/ui first", die umgebenden Bullets sind unverändert, keine doppelten Leerzeilen oder abgeschnittenen Sätze.

Erwartet: Bullet ist vollständig, an der richtigen Stelle, Rest der Datei unverändert (`git diff CLAUDE.md` zeigt ausschließlich den neuen Block als Hinzufügung).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: point Key Conventions at the new autonomous notification rule"
```

---

## Self-Review (durchgeführt beim Schreiben dieses Plans)

1. **Spec-Abdeckung:** Trigger-Kategorien ✓ (Task 1, Step 1), Retry-Mechanik inkl. Backoff ✓ (Task 1, Step 1), Dateiplatzierung inkl. Begründung ✓ (Task 1 + Task 2), Out-of-Scope-Punkte (kein Telegram/Slack/E-Mail, kein neuer Toggle) sind implizit durch das, was NICHT gebaut wird — keine offene Spec-Anforderung ohne Task.
2. **Platzhalter-Scan:** keine TBD/TODO, jeder Step enthält den vollständigen einzufügenden Text statt einer Paraphrase.
3. **Konsistenz:** Der in Task 2 referenzierte Dateiname (`.claude/rules/autonomous.md`) stimmt mit dem in Task 1 erzeugten Pfad überein; die in Task 2 zitierten Werte (3 Minuten, 15 Minuten, 30 Minuten) stimmen mit Task 1 und der Spec überein.
