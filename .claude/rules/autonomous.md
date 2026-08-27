# Autonome Benachrichtigung bei echten Blockern

> Nicht von `create-ai-eng-app update` verwaltet — eigene Projektregel, analog zu `.claude/rules/instincts.md`. Verankert über `CLAUDE.md` → Key Conventions.

## Slack-Ziel

Versand läuft über `scripts/slack-notify.ts` (eigene Slack-App mit Bot Token Scope `chat:write`, im Workspace installiert und in den Ziel-Channel eingeladen) — **nicht** über die persönliche claude.ai-Slack-Verbindung. Der Grund: Nachrichten über die persönliche Verbindung kommen technisch von dir selbst, und Slack benachrichtigt grundsätzlich nie für eigene Nachrichten — getestet über Self-DM, `@`-Mention und Channel, in allen drei Fällen lautlos. Ein Bot mit eigener Identität hat dieses Problem nicht.

Setup (einmalig): Slack-App unter [api.slack.com/apps](https://api.slack.com/apps) anlegen (Template „Blank app"), Bot Token Scope `chat:write` hinzufügen, im Workspace installieren, Bot in den Ziel-Channel einladen. Danach `SLACK_BOT_TOKEN` und `SLACK_NOTIFY_CHANNEL_ID` in `.env.local` eintragen (Platzhalter in `.env.local.example` dokumentiert). Fehlt einer der beiden Werte, meldet das Script das über Exit-Code + stderr — siehe Schritt 2 unten.

## Wann diese Regel gilt

Nur während die Session im Auto-Mode läuft (system-seitig als aktiv markiert). Ist der Auto-Mode aus, gilt ausschließlich `.claude/rules/general.md` → „Human-in-the-Loop" — keine aktive Benachrichtigung, nur die Chat-Frage.

## Was ein echter Blocker ist

Genau vier Kategorien lösen eine aktive Benachrichtigung aus:

1. **Setup/Credentials, die nur am Rechner des Menschen gehen** — fehlende `.env.local`-Werte, Docker nicht gestartet, `gh` nicht angemeldet. Bestehende Hand-off-Fälle aus `/verify-setup`, `/init`, `/deploy`.
2. **Die in `.claude/rules/security.md` → „Code Review Triggers" bereits genannten Pflicht-Freigaben** — Änderungen an RLS-Policies, am Auth-Flow. Die Freigabepflicht besteht dort bereits; neu ist nur die zusätzliche aktive Benachrichtigung. (Neue Env-Vars zählen nicht dazu — `security.md` verlangt dafür nur Dokumentation in `.env.local.example`, keine Freigabe; ein echter Wert dafür läuft ohnehin schon über Kategorie 1, weil er nur am Rechner des Menschen in `.env.local` landen kann.)
3. **Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung** — erster `/deploy` (legt ein gehostetes Supabase-Projekt mit fixer, nie mehr änderbarer Region an), ein PR steht auf „ready for review" und wartet auf deinen Merge, ein Merge nach `main`.
4. **Übergang `/tasks` → `/build`** — sobald die Tasks stehen und `/build` als nächstes starten würde. Ab hier entsteht Code; das ist der teuerste Punkt, um eine falsche Richtung zu korrigieren, bevor tatsächlich Arbeit hineinfließt. Weil `/write-spec` → `/architecture` → `/tasks` ohne Chat-Bestätigung durchläuft (siehe „Automatische Phasenübergänge"), ist dieser Stop der **einzige** verbleibende menschliche Checkpoint, bevor Code entsteht — die Chat-Nachricht/Slack-DM muss deshalb mehr sein als eine Ja/Nein-Frage: eine kurze Zusammenfassung der wichtigsten autonom getroffenen Annahmen aus `/write-spec` und `/architecture` (Scope-Entscheidungen, selbst beantwortete offene Fragen, Einträge aus dem Technical-Decisions-Log), plus die Pfade zu `spec.md`, `design.md` und `tasks.md` der Feature. Ohne das genehmigt der Mensch eine Richtung, die er nie gesehen hat. Siehe „Automatische Phasenübergänge" unten für die anderen Übergänge, die *nicht* hierher gehören.

**Kein Trigger:** normale Rückfragen *innerhalb* einer Phase — z. B. `/architecture`s `AskUserQuestion`-Rückfragen in Schritt 2 (Login/Accounts nötig? Datensync? mehrere Rollen? Drittanbieter?) oder `/build`s „Asking vs. Assuming"/„Surface Your Assumptions"-Muster — und generische Human-in-the-Loop-Checkpoints aus `general.md`. Die entscheidet der Auto-Mode weiterhin selbst — eine begründete Annahme treffen, die Annahme kurz nennen, weiterarbeiten. Würde jede dieser Rückfragen auch eine Benachrichtigung auslösen, würde sie durch die Häufigkeit wertlos. Die Übergänge *zwischen* Phasen (`/write-spec`→`/architecture`→`/tasks`, `/build`→`/qa`, der `/qa`→`/build`-Bugfix-Loop) sind ebenfalls kein Blocker in diesem Sinne — die laufen automatisch, siehe „Automatische Phasenübergänge".

## Ablauf bei einem echten Blocker

1. Frage/Kontext wie gewohnt im Chat formulieren — die Slack-Nachricht ersetzt den Text nie, sie lenkt nur die Aufmerksamkeit dorthin.
2. `npx tsx scripts/slack-notify.ts "<Nachricht>"` per Bash ausführen: knapp, handlungsorientiert. Beispiel: „PROJ-3: RLS-Änderung braucht deine Freigabe, bevor /build weitermacht." Das Script meldet einen fehlenden `SLACK_BOT_TOKEN`/`SLACK_NOTIFY_CHANNEL_ID` oder einen fehlgeschlagenen Versand über Exit-Code + stderr — **das im Chat als Fehler melden** statt stillschweigend zu übergehen, eine Regel, die unbemerkt wirkungslos wird, ist schlimmer als eine, die ehrlich einen Fehlschlag zeigt.
3. `CronCreate` planen (one-shot, `recurring: false`): prüft, ob der Blocker noch offen ist. `CronCreate` nimmt keine relative Verzögerung, sondern eine absolute Cron-Zeit (5 Felder, lokale Zeit) — die Zielzeit (jetzt + ca. 3 Minuten, inklusive Stunden-/Tages-/Monatsübertrag) selbst berechnen und in die Cron-Felder eintragen. Jede Auslösung startet einen neuen, zustandslosen Durchlauf — der einzige Zustand, der zwischen den Checks überlebt, ist der Text im `prompt`-Argument von `CronCreate`. Der Prompt muss deshalb enthalten: (a) worum es beim Blocker geht, (b) woran der nächste Durchlauf erkennt, dass er erledigt ist, (c) die aktuelle Wiederholungszahl, damit der nächste Durchlauf weiß, ob er noch im 3-Minuten-Takt (erste 5 Wiederholungen) oder schon im 30-Minuten-Takt (Backoff, Schritt 4) ist.
   - **Noch offen** → erneut eine Slack-Nachricht mit derselben Kernaussage, wieder einen Cron-Job für die nächste absolute Zielzeit mit aktualisiertem Prompt (Wiederholungszahl +1) nachlegen.
   - **Erledigt/beantwortet** → keine weitere Nachricht, kein neuer Cron-Job.
   - **Löst sich der Blocker außerhalb eines Checks** (der Nutzer antwortet im Chat, bevor der nächste geplante Cron-Job feuert) → den offenen Job sofort mit `CronDelete` (Job-ID aus der `CronCreate`-Antwort) abbrechen, statt ihn ungenutzt verfallen zu lassen.
4. **Backoff:** nach 5 Wiederholungen (~15 Minuten) auf ein 30-Minuten-Intervall wechseln statt weiter im 3-Minuten-Takt zu senden.
5. Existiert unabhängige Arbeit (z. B. andere `[P]`-Tasks in `/build`, ein anderes Feature), damit weitermachen statt untätig zu warten — aber: `CronCreate`-Jobs feuern nur, solange die Session idle ist (nicht mitten in einer laufenden Anfrage). Der ~3-Minuten-Takt ist deshalb best-effort und nur exakt, wenn die Session sonst nichts tut. Arbeitet der Agent an unabhängigen Tasks weiter, verzögert sich der Check — und jede fällige Wiederholungs-Nachricht — entsprechend, bis die Session das nächste Mal idle wird.

## Automatische Phasenübergänge

Überschreibt für genau die folgenden Übergänge `.claude/rules/general.md` → „Handoffs Between Skills" (dort: „always user-initiated, never automatic") — nur im Auto-Mode:

1. **`/write-spec` → `/architecture` → `/tasks`:** laufen ohne Chat-Bestätigung durch. Bei jedem Übergang eine einzelne Slack-Nachricht als Information (kein `CronCreate`-Retry — das ist kein Blocker), knapp gehalten, z. B. „PROJ-1: Spec fertig, weiter mit /architecture." `/architecture`s Schritt 6 („User Review" — die einzige terminale Freigabe der Phase, siehe `.claude/skills/architecture/SKILL.md`) zählt dabei als der Übergang `/architecture` → `/tasks`, nicht als Rückfrage *innerhalb* der Phase: sie läuft hier ebenfalls automatisch durch, kein manueller Stop.
2. **`/tasks` → `/build`:** siehe Kategorie 4 oben — voller Stop mit Retry-Mechanik.
3. **`/build` → `/qa`:** automatisch, sobald `/build` **fertig** ist — Info-Nachricht wie bei den Doku-Phasen, kein Stop. „Fertig" heißt konkret: alle Tasks in `tasks.md` abgehakt und die vier Checks (`lint`, `typecheck`, `build`, `test`) grün (siehe `CLAUDE.md` → Key Conventions). Ein abgebrochener oder geflaggter `/build`-Lauf — z. B. Widerspruch zwischen `design.md` und `docs/data-model.md`, überlappende `[P]`-Tasks, eine nötige Änderung an der App-Shell, lokaler Supabase-Stack nicht gestartet (siehe `.claude/skills/build/SKILL.md`) — ist **nicht** „fertig" und kein automatischer Übergang; dann bleibt es bei der normalen Chat-Rückfrage. Begründung für den automatischen Übergang selbst: `/qa` schreibt nur in Testumgebung und Feature-Branch (Unit-Tests, `qa-report.md`, INDEX-Status) — nichts mit externer Wirkung, geringes Risiko.
4. **`/qa` → `/build` (Bugfix-Loop):** findet `/qa` Bugs, läuft `/build` automatisch erneut an, um sie zu fixen — Info-Nachricht wie bei den anderen automatischen Übergängen, kein Stop (danach wieder automatisch `/build` → `/qa`, siehe Punkt 3). Das ist ausdrücklich **nicht** Kategorie 4: Die Richtung steht durch den QA-Report bereits fest (genau diese Bugs fixen) — anders als der frische Einstieg `/tasks` → `/build`, wo noch kein Code existiert und die Gesamtrichtung zum ersten Mal feststeht. Ein bereits belegter Kurs ist kein neuer Entscheidungspunkt.
5. **Nach erfolgreich bestandener `/qa`** (production-ready, keine offenen Bugs): gilt wieder der normale, unveränderte Ablauf aus `general.md`/`CLAUDE.md` — `/e2e-tests`, nächstes Feature, oder `/deploy`. `/deploy` bleibt vollständig über Kategorie 3 abgesichert.

Ausdrücklich unverändert: `/architecture`s `AskUserQuestion`-Rückfragen aus Schritt 2 und `/build`s „Asking vs. Assuming"-Muster (viele kleine Rückfragen *innerhalb* einer Phase, kein Phasenübergang) sowie alle anderen generischen Human-in-the-Loop-Checkpoints aus `general.md`. Ausgenommen davon: `/architecture`s Schritt 6 — das *ist* der Übergang `/architecture` → `/tasks` (siehe Punkt 1 oben) und läuft automatisch, nicht als manueller Stop.

## Dedup

Pro offenem Blocker läuft genau ein Retry-Zyklus — auch wenn derselbe Punkt mehrfach berührt wird (z. B. durch mehrere parallele `[P]`-Tasks). Keine zweite Nachricht für einen Blocker, der schon einen laufenden Zyklus hat.

## Grenzen

- `CronCreate`-Jobs sind session-only: Sie laufen nur, solange diese Claude-Code-Session offen ist. Schließt der Nutzer das Terminal, verfällt der Retry-Mechanismus mit — keine Persistenz über die Session hinaus.
- Der Bot-Token liegt in `.env.local` und ist damit maschinengebunden — auf einem neuen Rechner/Klon muss er neu eingetragen werden (kein Session- oder Konto-Problem wie bei einer persönlichen MCP-Verbindung).
- **Nie die persönliche claude.ai-Slack-Verbindung für diesen Zweck verwenden** — siehe „Slack-Ziel" oben. Sie sendet als du selbst, Slack benachrichtigt nie für eigene Nachrichten, das Ergebnis ist optisch identisch mit einer funktionierenden Regel, aber lautlos.

## Bezug

Vollständige Herleitung und Alternativen-Abwägung: `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`, `docs/superpowers/specs/2026-08-27-autonomous-notifications-slack-and-phases-design.md`
