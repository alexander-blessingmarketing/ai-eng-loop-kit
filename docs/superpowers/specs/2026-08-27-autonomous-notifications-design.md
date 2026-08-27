# Design: Aktive Benachrichtigung bei echten Blockern im Auto-Mode

**Datum:** 2026-08-27
**Status:** Zur Freigabe

## Problem

Die Session läuft im Auto-Mode: Claude soll bei den meisten Rückfragen selbst entscheiden und weiterarbeiten, statt zu unterbrechen. Bei einem echten Blocker (fehlende Credentials, eine Pflicht-Freigabe, eine Aktion mit externen Konsequenzen) bleibt aktuell nur eine unbeantwortete Frage im Chat-Verlauf stehen. Ist der Nutzer nicht am Rechner, wird das leicht übersehen — die Session steht still, ohne dass er es merkt.

## Ziel / Scope

Wenn ein **echter Blocker** auftritt, soll Claude aktiv die Aufmerksamkeit des Nutzers holen — über das bereits im Environment vorhandene `PushNotification`-Tool (Desktop-Notification, zusätzlich Handy-Push wenn Remote Control verbunden ist). Kein Telegram/Slack/E-Mail — dafür gäbe es keinen bestehenden Kanal, es würde eigene Zugangsdaten in `.env.local` und eigenen Versand-Code erfordern, und die eingebaute Push-Benachrichtigung deckt den Bedarf bereits ab. Das bleibt bewusst außerhalb dieses Scopes; falls sich in der Praxis zeigt, dass Push nicht reicht (z. B. weil nie am Gerät), ist das ein separates, späteres Vorhaben.

Reagiert der Nutzer nicht, wird die Benachrichtigung wiederholt statt genau einmal gesendet — eine einzelne Push-Notification kann leicht untergehen.

## Trigger: was ein "echter Blocker" ist

Nur drei Kategorien lösen eine Benachrichtigung aus:

1. **Setup/Credentials, die nur am Rechner des Menschen gehen** — fehlende `.env.local`-Werte, Docker nicht gestartet, `gh` nicht angemeldet. Das sind die bereits bestehenden Hand-off-Fälle aus `/verify-setup`, `/init`, `/deploy`.
2. **Die in `.claude/rules/security.md` → "Code Review Triggers" bereits benannten Pflicht-Freigaben** — Änderungen an RLS-Policies, am Auth-Flow, neue Env-Vars. Die Freigabepflicht selbst ist nicht neu; neu ist nur, dass sie jetzt zusätzlich zur Chat-Frage eine Push-Benachrichtigung auslöst.
3. **Account-/Kosten-/kaum umkehrbare Aktionen mit externer Wirkung** — erster `/deploy` (legt ein gehostetes Supabase-Projekt mit fixer, nie mehr änderbarer Region an), ein PR wird auf "ready for review" gesetzt, ein Merge nach `main`.

**Kein Trigger:** die normalen Zwischenfragen in `/write-spec`, `/architecture` (Abschnitt-für-Abschnitt-Freigabe), generische "Human-in-the-Loop"-Checkpoints aus `general.md`. Die entscheidet der Auto-Mode weiterhin selbst, macht eine begründete Annahme und macht weiter — dafür ist der Auto-Mode da. Würde jede dieser Rückfragen auch pushen, würde die Benachrichtigung wertlos, weil sie ständig kommt.

## Mechanik

1. Blocker erkannt → wie gewohnt die Frage/den Kontext im Chat formulieren (die Push-Notification ersetzt den Text nie, sie lenkt nur die Aufmerksamkeit dorthin).
2. Direkt danach: `PushNotification` mit einer knappen, handlungsorientierten Zusammenfassung (<200 Zeichen, kein Markdown) — z. B. „PROJ-3: RLS-Änderung braucht deine Freigabe, bevor /build weitermacht."
3. Direkt danach: `CronCreate` (one-shot, `recurring: false`, ca. 3 Minuten später) mit einem Prompt, der prüft, ob der Blocker noch offen ist.
   - **Noch offen** → erneut `PushNotification` mit derselben Kernaussage, und einen weiteren 3-Minuten-Check nachlegen.
   - **Erledigt/beantwortet** → keine weitere Notification, kein neuer Cron-Job.
4. **Backoff nach 5 Wiederholungen (~15 Minuten):** danach auf ein 30-Minuten-Intervall wechseln, statt weiter im 3-Minuten-Takt zu pushen. Verhindert, dass eine mehrstündige Abwesenheit zu dutzenden Pushs führt.
5. Ist eine unabhängige Teilaufgabe vorhanden (z. B. andere `[P]`-Tasks in `/build`, ein anderes Feature), macht Claude damit weiter, statt untätig auf die Antwort zu warten.

**Dedup:** pro offenem Blocker läuft genau ein Retry-Zyklus. Löst derselbe Blocker mehrfach eine Prüfung aus (z. B. weil mehrere parallele `[P]`-Tasks denselben Punkt berühren), wird er nur einmal verfolgt.

## Grenzen (Plattform, nicht Design)

- `CronCreate`-Jobs sind **session-only**: Sie laufen nur, solange diese Claude-Code-Session offen ist. Schließt der Nutzer das Terminal, verfällt der Retry-Mechanismus mit — keine Hintergrund-Persistenz über die Session hinaus.
- Push-Notifications erreichen das Handy nur, wenn Remote Control verbunden ist; sonst nur Desktop.

## Dateiplatzierung

`.claude/rules/general.md` und `security.md` sind **managed** (werden von `create-ai-eng-app update` überschrieben) — die neue Regel darf dort nicht hinein. Stattdessen, analog zum bereits bestehenden `.claude/rules/instincts.md` (ebenfalls nicht in der `managed`-Liste in `.ai-eng-kit`):

- **Neue Datei `.claude/rules/autonomous.md`** — enthält die vollständige Trigger- und Retry-Logik aus diesem Dokument.
- **Ein `⚠️`-Eintrag in `CLAUDE.md` → Key Conventions**, im bestehenden Stil der anderen dort dokumentierten Abweichungen (Branch/PR-Workflow, Lint/Typecheck-Gate, Deploy-Strategie): kurze Begründung + Verweis auf `autonomous.md`.
- Kein neuer Toggle in `.ai-eng-kit` nötig — die Regel ist an den ohnehin schon vorhandenen Auto-Mode-Zustand der Session gekoppelt. Ist Auto-Mode aus, gilt die Regel nicht.

## Out of Scope

- Telegram/Slack/E-Mail als Kanal (siehe oben).
- Persistenz über das Ende der Claude-Code-Session hinaus.
- Ein Ein-/Ausschalter unabhängig vom Auto-Mode.
