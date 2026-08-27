# Slack-Benachrichtigung + automatische Phasenübergänge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.claude/rules/autonomous.md` sendet Blocker-Benachrichtigungen über eine Slack-Direktnachricht statt über das nicht funktionierende `PushNotification`, und der Auto-Mode läuft zusätzlich automatisch durch die Doku-Phasen (`/write-spec`→`/architecture`→`/tasks`), mit einem harten Stop nur noch vor `/build`.

**Architecture:** Zwei reine Dokumentationsänderungen (kein Code, keine Tests im klassischen Sinn), analog zum ersten Durchlauf: `.claude/rules/autonomous.md` wird komplett neu geschrieben (Teil A: Kanal-Wechsel; Teil B: neue Kategorie 4 + Phasenübergangs-Abschnitt), der `⚠️`-Bullet in `CLAUDE.md` → Key Conventions wird entsprechend angepasst. "Verifikation" heißt: Datei zurücklesen und gegen Spec/Checkliste prüfen, plus ein grep-Check, dass keine `PushNotification`-Reste übrig bleiben.

**Tech Stack:** Markdown-Dokumentation. Zur Laufzeit relevant: der harness-eigene `CronCreate`/`CronDelete` (unverändert aus dem ersten Durchlauf) und der Slack-MCP-Server (neu — kein eigener Code, kein Script, Claude ruft dessen Tools direkt auf).

**Spec:** `docs/superpowers/specs/2026-08-27-autonomous-notifications-slack-and-phases-design.md` (ergänzt `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`)

## Global Constraints

- Versandweg ist ausschließlich Slack-DM (kein Telegram, keine E-Mail, kein Parallelbetrieb mit `PushNotification`).
- Die Slack-Ziel-ID ist kein Secret, darf aber nicht in `.env.local` — Claude darf diese Datei nicht lesen und bräuchte den Wert direkt als Tool-Parameter. Sie steht als ausfüllbare Platzhalterzeile direkt in `.claude/rules/autonomous.md`.
- Schlägt der Slack-Versand fehl, wird das explizit im Chat als Fehler gemeldet, nie still verschluckt.
- Die bestehenden drei Blocker-Kategorien, die `CronCreate`-Retry-Mechanik (absolute Cron-Zeit, zustandsbehafteter Prompt, Backoff nach 5 Wiederholungen auf 30 Minuten, `CronDelete` bei früher Auflösung) bleiben inhaltlich unverändert — nur der Sende-Schritt wechselt.
- Neue Kategorie 4 (`/tasks` → `/build`) bekommt exakt dieselbe Push+Retry-Behandlung wie Kategorien 1–3.
- `/write-spec` → `/architecture` → `/tasks` sowie `/build` → `/qa` laufen ohne Chat-Bestätigung durch, mit einer einzelnen (nicht wiederholten) Slack-Info-Nachricht pro Übergang.
- Nach `/qa` bleibt der bestehende Ablauf (general.md/CLAUDE.md) unverändert; `/deploy` bleibt über Kategorie 3 abgesichert.
- `.claude/rules/general.md` und `.claude/rules/security.md` sind managed — an ihnen wird nichts geändert.

---

## File Structure

- **Modify (voller Neuschrieb):** `.claude/rules/autonomous.md` — Teil A (Kanalwechsel) und Teil B (Kategorie 4 + Phasenübergänge) landen in derselben Datei, weil beides denselben Mechanismus (Blocker-Erkennung, Sende-Schritt, Retry) teilt bzw. direkt darauf aufbaut.
- **Modify:** `CLAUDE.md` — der bestehende `⚠️`-Bullet unter „Key Conventions" wird ersetzt (nicht ergänzt), damit er nicht doppelt von Push-Benachrichtigung *und* Slack-Nachricht spricht.

Task 2 zitiert Formulierungen aus Task 1s Ergebnis — daher in dieser Reihenfolge, aber beide sind unabhängig überprüfbar (verschiedene Dateien).

---

### Task 1: `.claude/rules/autonomous.md` komplett neu schreiben

**Files:**
- Modify (voller Überschreib): `.claude/rules/autonomous.md`

**Interfaces:**
- Produces: Abschnittsüberschriften `## Slack-Ziel`, `## Wann diese Regel gilt`, `## Was ein echter Blocker ist`, `## Ablauf bei einem echten Blocker`, `## Automatische Phasenübergänge`, `## Dedup`, `## Grenzen`, `## Bezug` — Task 2 referenziert nur den Dateipfad und die Begriffe „Kategorie 4" / „Slack-Direktnachricht", keine internen Anker.

- [ ] **Step 1: Datei komplett überschreiben**

Aktuellen Inhalt vollständig ersetzen durch exakt diesen Text:

```markdown
# Autonome Benachrichtigung bei echten Blockern

> Nicht von `create-ai-eng-app update` verwaltet — eigene Projektregel, analog zu `.claude/rules/instincts.md`. Verankert über `CLAUDE.md` → Key Conventions.

## Slack-Ziel

Direktnachrichten gehen an diese Slack-Member-ID: `<HIER-DEINE-SLACK-MEMBER-ID-EINTRAGEN>` — zu finden über dein Slack-Profil → „..." → „Mitglieds-ID kopieren". Ohne autorisierten Slack-MCP-Server (`claude mcp` bzw. `/mcp`, oder die claude.ai-Connector-Einstellungen) läuft der Versand ins Leere — siehe „Grenzen" unten.

## Wann diese Regel gilt

Nur während die Session im Auto-Mode läuft (system-seitig als aktiv markiert). Ist der Auto-Mode aus, gilt ausschließlich `.claude/rules/general.md` → „Human-in-the-Loop" — keine aktive Benachrichtigung, nur die Chat-Frage.

## Was ein echter Blocker ist

Genau vier Kategorien lösen eine aktive Benachrichtigung aus:

1. **Setup/Credentials, die nur am Rechner des Menschen gehen** — fehlende `.env.local`-Werte, Docker nicht gestartet, `gh` nicht angemeldet. Bestehende Hand-off-Fälle aus `/verify-setup`, `/init`, `/deploy`.
2. **Die in `.claude/rules/security.md` → „Code Review Triggers" bereits genannten Pflicht-Freigaben** — Änderungen an RLS-Policies, am Auth-Flow. Die Freigabepflicht besteht dort bereits; neu ist nur die zusätzliche aktive Benachrichtigung. (Neue Env-Vars zählen nicht dazu — `security.md` verlangt dafür nur Dokumentation in `.env.local.example`, keine Freigabe; ein echter Wert dafür läuft ohnehin schon über Kategorie 1, weil er nur am Rechner des Menschen in `.env.local` landen kann.)
3. **Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung** — erster `/deploy` (legt ein gehostetes Supabase-Projekt mit fixer, nie mehr änderbarer Region an), ein PR steht auf „ready for review" und wartet auf deinen Merge, ein Merge nach `main`.
4. **Übergang `/tasks` → `/build`** — sobald die Tasks stehen und `/build` als nächstes starten würde. Ab hier entsteht Code; das ist der teuerste Punkt, um eine falsche Richtung zu korrigieren, bevor tatsächlich Arbeit hineinfließt. Siehe „Automatische Phasenübergänge" unten für die anderen Übergänge, die *nicht* hierher gehören.

**Kein Trigger:** normale Rückfragen *innerhalb* einer Phase (z. B. `/architecture`s Abschnitt-für-Abschnitt-Freigabe) und generische Human-in-the-Loop-Checkpoints aus `general.md`. Die entscheidet der Auto-Mode weiterhin selbst — eine begründete Annahme treffen, die Annahme kurz nennen, weiterarbeiten. Würde jede dieser Rückfragen auch eine Benachrichtigung auslösen, würde sie durch die Häufigkeit wertlos. Die Übergänge *zwischen* Phasen (`/write-spec`→`/architecture`→`/tasks`, `/build`→`/qa`) sind ebenfalls kein Blocker in diesem Sinne — die laufen automatisch, siehe „Automatische Phasenübergänge".

## Ablauf bei einem echten Blocker

1. Frage/Kontext wie gewohnt im Chat formulieren — die Slack-Nachricht ersetzt den Text nie, sie lenkt nur die Aufmerksamkeit dorthin.
2. Eine Slack-Direktnachricht an das oben eingetragene Ziel senden (über den Slack-MCP-Server, sobald autorisiert — exakter Tool-Name situationsabhängig, per `ToolSearch`/dem `slack:slack-messaging`-Skill auflösen, nicht hartkodieren): knapp, handlungsorientiert. Beispiel: „PROJ-3: RLS-Änderung braucht deine Freigabe, bevor /build weitermacht." Schlägt der Versand fehl (nicht autorisiert, ID ungültig, Server nicht verbunden), das **explizit im Chat als Fehler melden** statt stillschweigend zu übergehen — eine Regel, die unbemerkt wirkungslos wird, ist schlimmer als eine, die ehrlich einen Fehlschlag zeigt.
3. `CronCreate` planen (one-shot, `recurring: false`): prüft, ob der Blocker noch offen ist. `CronCreate` nimmt keine relative Verzögerung, sondern eine absolute Cron-Zeit (5 Felder, lokale Zeit) — die Zielzeit (jetzt + ca. 3 Minuten, inklusive Stunden-/Tages-/Monatsübertrag) selbst berechnen und in die Cron-Felder eintragen. Jede Auslösung startet einen neuen, zustandslosen Durchlauf — der einzige Zustand, der zwischen den Checks überlebt, ist der Text im `prompt`-Argument von `CronCreate`. Der Prompt muss deshalb enthalten: (a) worum es beim Blocker geht, (b) woran der nächste Durchlauf erkennt, dass er erledigt ist, (c) die aktuelle Wiederholungszahl, damit der nächste Durchlauf weiß, ob er noch im 3-Minuten-Takt (erste 5 Wiederholungen) oder schon im 30-Minuten-Takt (Backoff, Schritt 4) ist.
   - **Noch offen** → erneut eine Slack-Direktnachricht mit derselben Kernaussage, wieder einen Cron-Job für die nächste absolute Zielzeit mit aktualisiertem Prompt (Wiederholungszahl +1) nachlegen.
   - **Erledigt/beantwortet** → keine weitere Nachricht, kein neuer Cron-Job.
   - **Löst sich der Blocker außerhalb eines Checks** (der Nutzer antwortet im Chat, bevor der nächste geplante Cron-Job feuert) → den offenen Job sofort mit `CronDelete` (Job-ID aus der `CronCreate`-Antwort) abbrechen, statt ihn ungenutzt verfallen zu lassen.
4. **Backoff:** nach 5 Wiederholungen (~15 Minuten) auf ein 30-Minuten-Intervall wechseln statt weiter im 3-Minuten-Takt zu senden.
5. Existiert unabhängige Arbeit (z. B. andere `[P]`-Tasks in `/build`, ein anderes Feature), damit weitermachen statt untätig zu warten — aber: `CronCreate`-Jobs feuern nur, solange die Session idle ist (nicht mitten in einer laufenden Anfrage). Der ~3-Minuten-Takt ist deshalb best-effort und nur exakt, wenn die Session sonst nichts tut. Arbeitet der Agent an unabhängigen Tasks weiter, verzögert sich der Check — und jede fällige Wiederholungs-Nachricht — entsprechend, bis die Session das nächste Mal idle wird.

## Automatische Phasenübergänge

Überschreibt für genau die folgenden Übergänge `.claude/rules/general.md` → „Handoffs Between Skills" (dort: „always user-initiated, never automatic") — nur im Auto-Mode:

1. **`/write-spec` → `/architecture` → `/tasks`:** laufen ohne Chat-Bestätigung durch. Bei jedem Übergang eine einzelne Slack-Direktnachricht als Information (kein `CronCreate`-Retry — das ist kein Blocker), knapp gehalten, z. B. „PROJ-1: Spec fertig, weiter mit /architecture."
2. **`/tasks` → `/build`:** siehe Kategorie 4 oben — voller Stop mit Retry-Mechanik.
3. **`/build` → `/qa`:** automatisch, sobald `/build` fertig ist — Info-Nachricht wie bei den Doku-Phasen, kein Stop. `/qa` ist read-only (Tests), geringes Risiko.
4. **Nach `/qa`:** gilt wieder der normale, unveränderte Ablauf aus `general.md`/`CLAUDE.md` — `/e2e-tests`, nächstes Feature, oder `/deploy`. `/deploy` bleibt vollständig über Kategorie 3 abgesichert.

Ausdrücklich unverändert: `/architecture`s Abschnitt-für-Abschnitt-Freigabe (viele kleine Rückfragen *innerhalb* einer Phase, kein Phasenübergang) und alle anderen generischen Human-in-the-Loop-Checkpoints aus `general.md`.

## Dedup

Pro offenem Blocker läuft genau ein Retry-Zyklus — auch wenn derselbe Punkt mehrfach berührt wird (z. B. durch mehrere parallele `[P]`-Tasks). Keine zweite Nachricht für einen Blocker, der schon einen laufenden Zyklus hat.

## Grenzen

- `CronCreate`-Jobs sind session-only: Sie laufen nur, solange diese Claude-Code-Session offen ist. Schließt der Nutzer das Terminal, verfällt der Retry-Mechanismus mit — keine Persistenz über die Session hinaus.
- Die Slack-Autorisierung ist an das Konto/die Session-Umgebung gebunden — bei einem Client- oder Maschinenwechsel eventuell erneut nötig (`claude mcp`/`/mcp` bzw. claude.ai-Connector-Einstellungen).

## Bezug

Vollständige Herleitung und Alternativen-Abwägung: `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`, `docs/superpowers/specs/2026-08-27-autonomous-notifications-slack-and-phases-design.md`
```

- [ ] **Step 2: Zurücklesen und gegen die Checkliste prüfen**

Mit dem Read-Tool `.claude/rules/autonomous.md` erneut lesen und gegenprüfen:
- „Genau vier Kategorien" — es sind tatsächlich vier nummerierte Punkte unter „Was ein echter Blocker ist".
- Kategorie 4 (`/tasks`→`/build`) ist vorhanden und verweist auf „Automatische Phasenübergänge".
- Der Abschnitt „Automatische Phasenübergänge" enthält alle vier Punkte (Doku-Phasen automatisch, `/tasks`→`/build` = Kategorie 4, `/build`→`/qa` automatisch, danach normaler Ablauf).
- Kein Vorkommen von „PushNotification", „Push-Benachrichtigung", „Handy-Push" oder „Desktop-Notification" mehr in der Datei (mit dem Grep-Tool prüfen: `grep -n "PushNotification\|Push-Benachrichtigung\|Handy-Push\|Desktop-Notification" .claude/rules/autonomous.md` muss leer sein).
- Die Zahlen 3 Minuten / 5 Wiederholungen / 15 Minuten / 30 Minuten sind unverändert aus der Vorversion übernommen.
- Die Platzhalterzeile für die Slack-Member-ID ist vorhanden und eindeutig als „hier eintragen" erkennbar.

Erwartet: alle Punkte treffen zu. Fehlt einer, Step 1 korrigieren und wiederholen.

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/autonomous.md
git commit -m "docs: switch blocker notifications to Slack DM, add auto phase transitions"
```

---

### Task 2: `CLAUDE.md`-Bullet aktualisieren

**Files:**
- Modify: `CLAUDE.md` (Abschnitt „## Key Conventions", der Bullet der mit „**⚠️ Im Auto-Mode: bei echten Blockern aktiv anklopfen" beginnt)

**Interfaces:**
- Consumes: Aus Task 1 die Begriffe „Kategorie 4" und „Slack-Direktnachricht" (nur als Textverweis).

- [ ] **Step 1: Aktuellen Bullet finden**

Mit dem Read-Tool `CLAUDE.md` öffnen und den vollständigen bestehenden Bullet lokalisieren, der mit „- **⚠️ Im Auto-Mode: bei echten Blockern aktiv anklopfen, nicht nur im Chat warten.**" beginnt und mit „... eine eigene, nicht verwaltete Datei." endet (zwei Absätze, direkt vor dem Bullet „- **shadcn/ui first:**").

- [ ] **Step 2: Bullet ersetzen**

Den gesamten in Step 1 gefundenen Bullet (beide Absätze) mit dem Edit-Tool durch exakt diesen Text ersetzen:

```markdown
- **⚠️ Im Auto-Mode: bei echten Blockern aktiv anklopfen, Doku-Phasen laufen automatisch durch.**
  Läuft die Session im Auto-Mode, entscheidet der Agent die meisten Rückfragen selbst und macht weiter. Bei vier eng gefassten Fällen reicht das nicht — fehlende Credentials/Setup, die in `.claude/rules/security.md` bereits geforderten Pflicht-Freigaben (RLS, Auth-Flow), Account-/Kosten-Aktionen mit externer Wirkung (erster Deploy, PR steht auf ready for review und wartet auf Merge, Merge nach main), und der Übergang `/tasks` → `/build` (ab hier entsteht Code). Ist der Nutzer dabei nicht am Rechner, fällt eine unbeantwortete Chat-Frage sonst nicht auf.

  Zusätzlich laufen `/write-spec` → `/architecture` → `/tasks` sowie `/build` → `/qa` ohne Chat-Bestätigung durch (überschreibt `general.md` → „Handoffs Between Skills" für genau diese Übergänge) — jeweils mit einer kurzen Info-Nachricht statt einer Blockade.

  Volle Trigger- und Retry-Logik (Slack-Direktnachricht + wiederholter 3-Minuten-Check per `CronCreate`, Backoff auf 30 Minuten nach 15 Minuten) steht in `.claude/rules/autonomous.md` und nicht in `.claude/rules/general.md` bzw. `security.md`, weil diese beiden Dateien **managed** sind und bei `create-ai-eng-app update` überschrieben werden. `autonomous.md` ist wie `instincts.md` eine eigene, nicht verwaltete Datei.
```

- [ ] **Step 3: Zurücklesen und gegen die Checkliste prüfen**

Mit dem Read-Tool `CLAUDE.md` erneut lesen und gegenprüfen:
- Der Bullet erwähnt „Slack" statt „Push-Benachrichtigung"/„PushNotification".
- Der Bullet nennt alle vier Kategorien (die drei ursprünglichen plus `/tasks`→`/build`).
- Der Bullet erwähnt die automatischen Phasenübergänge (`/write-spec`→`/architecture`→`/tasks`, `/build`→`/qa`) und den Verweis auf `general.md` → „Handoffs Between Skills".
- Die Zahlen (3 Minuten, 15 Minuten, 30 Minuten) stimmen mit `.claude/rules/autonomous.md` überein.
- `git diff CLAUDE.md` zeigt ausschließlich diesen einen Bullet als Änderung — nichts davor oder danach ist betroffen.
- Mit dem Grep-Tool projektweit prüfen, dass keine der beiden Dateien mehr „PushNotification" erwähnt: `grep -rn "PushNotification\|Push-Benachrichtigung\|Handy-Push\|Desktop-Notification" .claude/rules/autonomous.md CLAUDE.md` muss leer sein.

Erwartet: alle Punkte treffen zu.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: point CLAUDE.md bullet at Slack notifications and auto phase transitions"
```

---

## Self-Review (durchgeführt beim Schreiben dieses Plans)

1. **Spec-Abdeckung:** Teil A (Kanalwechsel, Fehler-Sichtbarkeit, Zielort-Entscheidung außerhalb `.env.local`) ✓ Task 1. Teil B (Kategorie 4, drei Phasenübergangs-Regeln, „ausdrücklich unverändert"-Klarstellung) ✓ Task 1. `CLAUDE.md`-Anpassung ✓ Task 2. Out-of-Scope-Punkte (kein Telegram/E-Mail, kein Ein-/Ausschalter) sind implizit durch das, was nicht gebaut wird.
2. **Platzhalter-Scan:** keine TBD/TODO; die einzige „Platzhalterzeile" ist absichtlich eine auszufüllende Nutzer-Angabe (Slack-Member-ID), nicht ein offener Punkt im Plan selbst.
3. **Konsistenz:** Die in Task 2 zitierten Werte (3/15/30 Minuten, vier Kategorien, Slack statt Push) stimmen mit Task 1 überein. Kategorie-4-Beschreibung ist in beiden Dateien identisch benannt (`/tasks` → `/build`).
