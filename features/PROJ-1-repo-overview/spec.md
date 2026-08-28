# PROJ-1: Repo-Übersicht

<!-- Diese Datei (spec.md) ist der stabile VERTRAG — sie definiert WAS, nicht WIE.
     Owner: /write-spec (erstellt), /refine (aktualisiert). Während /build ist diese Datei READ-ONLY.
     Technisches Design lebt in design.md, QA-Ergebnisse in qa-report.md. -->

## Dependencies
- Keine

## User Stories
- Als Nutzer möchte ich beim Öffnen des Tools sofort alle meine aktiven GitHub-Repos sehen, damit ich einen schnellen Überblick über meine Projekte habe.
- Als Nutzer möchte ich pro Repo die wichtigsten Kennzahlen (Sprache, letzte Aktualisierung, offene PRs, Sichtbarkeit) sehen, ohne dafür GitHub öffnen zu müssen.
- Als Nutzer möchte ich die Liste automatisch nach zuletzt aktualisiert sortiert sehen, damit meine aktivsten Projekte oben stehen.
- Als Nutzer möchte ich auf ein Repo klicken können, um zur Detailansicht zu gelangen.
- Als Nutzer möchte ich eine klare Fehlermeldung sehen, wenn die Verbindung zu GitHub nicht funktioniert (fehlender/ungültiger Token, Rate-Limit, Netzwerkfehler), damit ich weiß, was los ist.

## Out of Scope
- Suche/Filter in der Liste — kommt mit PROJ-3
- Anzeige archivierter Repos oder Forks — bewusst ausgeblendet, kein Toggle in dieser Version
- Inhalt der Detailansicht (Commit-Historie, PR-Liste im Detail) — gehört zu PROJ-2, PROJ-1 liefert nur die Navigation dorthin
- OAuth-Login-Flow für GitHub — nicht nötig bei einem Ein-Personen-Tool mit Personal Access Token
- Schreibende Aktionen auf GitHub (Mergen, Kommentieren) — laut PRD-Non-Goals nie Teil des Tools

## Acceptance Criteria

- [ ] **AC-1** — Angenommen ein gültiger GitHub-Token ist konfiguriert, wenn die Repo-Übersicht geladen wird, dann werden alle nicht-archivierten, nicht-geforkten Repos des Nutzers angezeigt, absteigend sortiert nach letzter Aktualisierung
- [ ] **AC-2** — Angenommen ein Repo wird in der Liste angezeigt, wenn die Karte gerendert wird, dann zeigt sie Name, Sichtbarkeit (privat/öffentlich), Primärsprache, Anzahl offener PRs und den relativen Zeitpunkt der letzten Aktualisierung
- [ ] **AC-3** — Angenommen der Nutzer hat keine aktiven (nicht-archivierten, nicht-geforkten) Repos, wenn die Liste geladen wird, dann wird ein Leerzustand mit erklärendem Hinweistext angezeigt statt einer leeren Fläche
- [ ] **AC-4** — Angenommen die Daten werden noch geladen, wenn die Seite aufgerufen wird, dann wird ein Skeleton-Ladezustand anstelle der echten Liste angezeigt
- [ ] **AC-5** — Angenommen kein oder ein ungültiger GitHub-Token ist konfiguriert, wenn die Repo-Übersicht geladen wird, dann wird eine klare Fehlermeldung angezeigt, die erklärt, dass der Token fehlt oder ungültig ist — keine leere Liste, kein technischer Stacktrace
- [ ] **AC-6** — Angenommen die GitHub-API antwortet mit einem Rate-Limit- oder Netzwerkfehler, wenn die Repo-Übersicht geladen wird, dann wird eine Fehlermeldung mit Retry-Möglichkeit angezeigt statt eines Absturzes
- [ ] **AC-7** — Angenommen der Nutzer klickt auf eine Repo-Karte, wenn der Klick verarbeitet wird, dann navigiert die App zur Detailansicht dieses Repos (Inhalt der Detailansicht: siehe PROJ-2)
- [ ] **AC-8** — Angenommen der GitHub-Token ist konfiguriert, wenn die Repo-Daten geladen werden, dann wird der Token ausschließlich serverseitig verwendet und erscheint zu keinem Zeitpunkt im clientseitigen Netzwerkverkehr des Browsers

## Edge Cases
- **EC-1** — Angenommen der Nutzer hat mehr als 100 Repos (GitHub-API-Pagination-Grenze pro Seite), wenn die Liste geladen wird, dann werden trotzdem alle Repos über mehrere API-Seiten hinweg geladen und vollständig angezeigt
- **EC-2** — Angenommen ein Repo hat keine erkennbare Primärsprache (z. B. ein reines Markdown-Repo), wenn die Karte gerendert wird, dann wird statt eines Sprachlabels ein neutraler Platzhalter angezeigt, kein leeres oder kaputtes UI-Element
- **EC-3** — Angenommen zwei Ladevorgänge überschneiden sich (z. B. schnelles Neuladen der Seite), wenn die zweite Antwort eintrifft, dann zeigt die UI konsistent nur die Daten der zuletzt gestarteten Anfrage — keine veralteten Daten durch eine langsamere, frühere Anfrage
- **EC-4** — Angenommen die GitHub-API liefert trotz Erfolgsstatus eine leere Antwort, wenn das passiert, dann wird das wie AC-3 (Leerzustand) behandelt, nicht als Fehler
- **EC-5** — Angenommen der konfigurierte Token hat nicht die nötigen Berechtigungen für alle Repos (z. B. kein Zugriff auf private Repos), wenn die Liste geladen wird, dann werden nur die für den Token sichtbaren Repos angezeigt, ohne dass das als Fehler missverstanden wird

## Technical Requirements (optional)
- Security: GitHub-Token wird ausschließlich serverseitig gehalten (`.env.local`), nie an den Client gegeben (siehe AC-8)
- Performance: unkritisch — rein lokales Ein-Personen-Tool, keine Lastanforderungen

## Open Questions
- Keine offenen Fragen — alle Punkte wurden im Rahmen der autonomen Bearbeitung entschieden (siehe Decision Log)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Archivierte Repos und Forks werden ausgeblendet | Reduziert Rauschen für einen Überblick über aktive Arbeit; per Nutzerfreigabe autonom entschieden | 2026-08-28 |
| GitHub-Zugriff über Personal Access Token (`.env.local`) statt OAuth-Login | Rein lokales Ein-Personen-Tool ohne Accounts — voller OAuth-Flow wäre unnötige Komplexität | 2026-08-28 |
| Keine UI-Pagination — alle Repo-Seiten werden serverseitig zusammengeführt (EC-1) | Für einen einzelnen GitHub-Account bleibt die Repo-Zahl überschaubar; Komplexität ist bei Bedarf später nachrüstbar | 2026-08-28 |
| Klick auf Repo-Karte navigiert zur Detailansicht, aber deren Inhalt gehört zu PROJ-2 | Saubere Feature-Grenze gemäß Single Responsibility | 2026-08-28 |
