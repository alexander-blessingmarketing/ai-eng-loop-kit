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
