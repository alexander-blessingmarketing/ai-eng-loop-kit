# Autonome Benachrichtigung bei echten Blockern

> Nicht von `create-ai-eng-app update` verwaltet — eigene Projektregel, analog zu `.claude/rules/instincts.md`. Verankert über `CLAUDE.md` → Key Conventions.

## Wann diese Regel gilt

Nur während die Session im Auto-Mode läuft (system-seitig als aktiv markiert). Ist der Auto-Mode aus, gilt ausschließlich `.claude/rules/general.md` → „Human-in-the-Loop" — keine aktive Benachrichtigung, nur die Chat-Frage.

## Was ein echter Blocker ist

Genau drei Kategorien lösen eine aktive Benachrichtigung aus:

1. **Setup/Credentials, die nur am Rechner des Menschen gehen** — fehlende `.env.local`-Werte, Docker nicht gestartet, `gh` nicht angemeldet. Bestehende Hand-off-Fälle aus `/verify-setup`, `/init`, `/deploy`.
2. **Die in `.claude/rules/security.md` → „Code Review Triggers" bereits genannten Pflicht-Freigaben** — Änderungen an RLS-Policies, am Auth-Flow. Die Freigabepflicht besteht dort bereits; neu ist nur die zusätzliche aktive Benachrichtigung. (Neue Env-Vars zählen nicht dazu — `security.md` verlangt dafür nur Dokumentation in `.env.local.example`, keine Freigabe; ein echter Wert dafür läuft ohnehin schon über Kategorie 1, weil er nur am Rechner des Menschen in `.env.local` landen kann.)
3. **Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung** — erster `/deploy` (legt ein gehostetes Supabase-Projekt mit fixer, nie mehr änderbarer Region an), ein PR steht auf „ready for review" und wartet auf deinen Merge, ein Merge nach `main`.

**Kein Trigger:** normale Rückfragen in `/write-spec`, `/architecture` (Abschnitt-für-Abschnitt-Freigabe) und generische Human-in-the-Loop-Checkpoints aus `general.md`. Die entscheidet der Auto-Mode weiterhin selbst — eine begründete Annahme treffen, die Annahme kurz nennen, weiterarbeiten. Würde jede dieser Rückfragen auch eine Benachrichtigung auslösen, würde sie durch die Häufigkeit wertlos.

## Ablauf bei einem echten Blocker

1. Frage/Kontext wie gewohnt im Chat formulieren — die Push-Notification ersetzt den Text nie, sie lenkt nur die Aufmerksamkeit dorthin.
2. `PushNotification` auslösen: knapp, handlungsorientiert, unter 200 Zeichen, kein Markdown. Beispiel: „PROJ-3: RLS-Änderung braucht deine Freigabe, bevor /build weitermacht." Meldet `PushNotification` „nicht gesendet", weil der Nutzer gerade aktiv am Terminal ist — dann ist er ohnehin da: keinen Retry-Zyklus (Schritt 3–4) starten, die Chat-Frage reicht.
3. `CronCreate` planen (one-shot, `recurring: false`): prüft, ob der Blocker noch offen ist. `CronCreate` nimmt keine relative Verzögerung, sondern eine absolute Cron-Zeit (5 Felder, lokale Zeit) — die Zielzeit (jetzt + ca. 3 Minuten, inklusive Stunden-/Tages-/Monatsübertrag) selbst berechnen und in die Cron-Felder eintragen. Jede Auslösung startet einen neuen, zustandslosen Durchlauf — der einzige Zustand, der zwischen den Checks überlebt, ist der Text im `prompt`-Argument von `CronCreate`. Der Prompt muss deshalb enthalten: (a) worum es beim Blocker geht, (b) woran der nächste Durchlauf erkennt, dass er erledigt ist, (c) die aktuelle Wiederholungszahl, damit der nächste Durchlauf weiß, ob er noch im 3-Minuten-Takt (erste 5 Wiederholungen) oder schon im 30-Minuten-Takt (Backoff, Schritt 4) ist.
   - **Noch offen** → erneut `PushNotification` mit derselben Kernaussage, wieder einen Cron-Job für die nächste absolute Zielzeit mit aktualisiertem Prompt (Wiederholungszahl +1) nachlegen.
   - **Erledigt/beantwortet** → keine weitere Notification, kein neuer Cron-Job.
   - **Löst sich der Blocker außerhalb eines Checks** (der Nutzer antwortet im Chat, bevor der nächste geplante Cron-Job feuert) → den offenen Job sofort mit `CronDelete` (Job-ID aus der `CronCreate`-Antwort) abbrechen, statt ihn ungenutzt verfallen zu lassen.
4. **Backoff:** nach 5 Wiederholungen (~15 Minuten) auf ein 30-Minuten-Intervall wechseln statt weiter im 3-Minuten-Takt zu pushen.
5. Existiert unabhängige Arbeit (z. B. andere `[P]`-Tasks in `/build`, ein anderes Feature), damit weitermachen statt untätig zu warten — aber: `CronCreate`-Jobs feuern nur, solange die Session idle ist (nicht mitten in einer laufenden Anfrage). Der ~3-Minuten-Takt ist deshalb best-effort und nur exakt, wenn die Session sonst nichts tut. Arbeitet der Agent an unabhängigen Tasks weiter, verzögert sich der Check — und jede fällige Wiederholungs-Notification — entsprechend, bis die Session das nächste Mal idle wird.

## Dedup

Pro offenem Blocker läuft genau ein Retry-Zyklus — auch wenn derselbe Punkt mehrfach berührt wird (z. B. durch mehrere parallele `[P]`-Tasks). Keine zweite Notification für einen Blocker, der schon einen laufenden Zyklus hat.

## Grenzen

- `CronCreate`-Jobs sind session-only: Sie laufen nur, solange diese Claude-Code-Session offen ist. Schließt der Nutzer das Terminal, verfällt der Retry-Mechanismus mit — keine Persistenz über die Session hinaus.
- Handy-Push nur, wenn Remote Control verbunden ist; sonst nur Desktop-Notification.

## Bezug

Vollständige Herleitung und Alternativen-Abwägung: `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md`
