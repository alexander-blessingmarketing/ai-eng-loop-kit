# Design: Slack statt PushNotification + automatische Phasenübergänge

**Datum:** 2026-08-27
**Status:** Zur Freigabe
**Ergänzt:** `docs/superpowers/specs/2026-08-27-autonomous-notifications-design.md` (bereits umgesetzt in `.claude/rules/autonomous.md`, main)

## Problem

Nach der ersten Umsetzung zeigten sich zwei Lücken beim Testen im echten Projekt:

1. `PushNotification` löst im VSCode-Client des Nutzers keine sichtbare Benachrichtigung aus. Der gesamte `CronCreate`-Retry-Mechanismus der ersten Version existiert nur, um genau diese Notification zu wiederholen — ohne funktionierenden Versand ist er wirkungslos, degradiert aber nicht sichtbar: die Regel *behauptet* weiterhin, sie benachrichtige aktiv.
2. Auch abseits der drei Blocker-Kategorien blieb die Session bei jedem Phasenübergang (`/write-spec` → `/architecture` → `/tasks` → `/build`) stehen und wartete auf eine Chat-Bestätigung — das kommt aus `.claude/rules/general.md` → „Handoffs Between Skills" („always user-initiated, never automatic") und ist unabhängig vom Auto-Mode. Für den Nutzer fühlte sich das nicht wie „autonom" an, weil das der überwiegende Teil der tatsächlichen Wartezeit war, nicht die drei engen Blocker-Fälle.

## Ziel / Scope

Teil A ersetzt den Versandweg der bereits bestehenden drei Blocker-Kategorien. Teil B erweitert den Autonomie-Grad um kontrollierte automatische Phasenübergänge. Beides landet in derselben Datei (`.claude/rules/autonomous.md`), weil beides denselben Kanal nutzt.

## Teil A: Slack-DM statt PushNotification

**Kanalwahl:** Slack, per Direktnachricht an den Nutzer. Begründung: Der Slack-MCP-Server ist in dieser Umgebung bereits als Plugin installiert (nur noch nicht autorisiert) — kein eigener Versand-Code, kein Secret-Handling für einen API-Key nötig, im Unterschied zu Telegram (eigenes Bot-Token + Script) oder E-Mail (eigener Versand-Anbieter + API-Key). Telegram wäre robuster gegenüber Client-Wechseln (keine Session-gebundene Autorisierung), wurde aber zugunsten des geringeren Einrichtungsaufwands zurückgestellt.

**Voraussetzung, die der Nutzer selbst erledigen muss:** Slack-MCP-Autorisierung — über die claude.ai-Connector-Einstellungen oder `claude mcp`/`/mcp` in einer interaktiven Session. Das kann kein Agent für ihn erledigen (nicht-interaktiver OAuth-Flow).

**Zieladresse:** Die Slack-Member-ID des Nutzers. Sie ist kein Secret, aber wird von Claude selbst als Tool-Parameter gebraucht — landet deshalb *nicht* in `.env.local` (die Regel verbietet Claude, diese Datei zu lesen, und genau das bräuchte der Mechanismus, um den Wert zu benutzen). Stattdessen: eine Platzhalterzeile direkt oben in `.claude/rules/autonomous.md`, die jeder Nutzer, der die Datei liest, sofort findet und ausfüllt.

**Versand:** Wo bisher `PushNotification` aufgerufen wurde, ruft die Regel jetzt das Slack-Tool zum Senden einer Direktnachricht auf (über den Slack-MCP-Server, exakter Tool-Name situationsabhängig — wird zur Laufzeit per `ToolSearch`/dem `slack:slack-messaging`-Skill aufgelöst, nicht hartkodiert, weil sich das je nach Verbindung unterscheiden kann). Schlägt der Aufruf fehl (nicht autorisiert, ID ungültig, Server nicht verbunden), wird das **explizit im Chat gemeldet** — als klar benannter Fehler, nicht stillschweigend übergangen. Das ist die Lehre aus dem `PushNotification`-Fall: eine Regel, die unbemerkt wirkungslos wird, ist schlimmer als eine, die ehrlich sagt „das hat nicht geklappt".

**Alles andere bleibt:** die drei Blocker-Kategorien, der `CronCreate`-Retry alle ~3 Minuten, der Backoff auf 30 Minuten nach 5 Wiederholungen (~15 Minuten), `CronDelete` bei vorzeitiger Auflösung, Dedup pro Blocker — unverändert aus der ersten Version. Nur der Versand-Schritt wechselt.

## Teil B: Automatische Phasenübergänge

Überschreibt für genau drei Übergänge `.claude/rules/general.md` → „Handoffs Between Skills" — nur im Auto-Mode.

1. **`/write-spec` → `/architecture` → `/tasks`:** laufen ohne Chat-Bestätigung durch. Bei jedem Übergang eine einzelne Slack-DM (kein `CronCreate`-Retry — das ist eine Information, kein Blocker), knapp gehalten, z. B. „PROJ-1: Spec fertig, weiter mit /architecture."
2. **`/tasks` → `/build`** wird eine vierte Blocker-Kategorie: voller Stop mit Chat-Frage, Slack-DM und `CronCreate`-Retry-Mechanik wie die bestehenden drei. Begründung: Ab hier entsteht Code — der teuerste Punkt, um eine falsche Richtung zu korrigieren, bevor tatsächlich Arbeit hineinfließt.
3. **Nach `/build`** automatisch weiter zu `/qa` (Info-Ping wie bei den Doku-Phasen, kein Stop) — `/qa` ist read-only (Tests), geringes Risiko.
4. **Nach `/qa`** gilt wieder der normale, unveränderte Ablauf aus `general.md`/`CLAUDE.md`: `/e2e-tests`, nächstes Feature, oder `/deploy`. `/deploy` bleibt vollständig über die bestehende Kategorie 3 (Account-/Kosten-Aktion) abgesichert — daran ändert sich nichts.

**Ausdrücklich unverändert:** `/architecture`s Abschnitt-für-Abschnitt-Freigabe (das sind viele kleine Rückfragen *innerhalb* einer Phase, kein Phasenübergang) und alle anderen generischen Human-in-the-Loop-Checkpoints aus `general.md` bleiben, wie sie sind — die entscheidet der Auto-Mode weiterhin selbst, ohne Notification.

## Grenzen (unverändert aus Teil 1 des ersten Designs)

- `CronCreate`-Jobs sind session-only.
- Die Slack-Autorisierung ist an das jeweilige Konto/die jeweilige Session-Umgebung gebunden — bei einem Client- oder Maschinenwechsel evtl. erneut nötig (im Unterschied zu Telegram, das clientunabhängig funktioniert hätte; bewusst in Kauf genommen für den geringeren Einrichtungsaufwand).

## Out of Scope

- Telegram/E-Mail als zusätzlicher oder alternativer Kanal (siehe Kanalwahl-Begründung).
- Ein Umschalter, um Teil B unabhängig von Teil A ein-/auszuschalten — beide landen zusammen in derselben Regel-Iteration.
