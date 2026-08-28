# PROJ-2: Repo-Detail

<!-- Diese Datei (spec.md) ist der stabile VERTRAG — sie definiert WAS, nicht WIE.
     Owner: /write-spec (erstellt), /refine (aktualisiert). Während /build ist diese Datei READ-ONLY.
     Technisches Design lebt in design.md, QA-Ergebnisse in qa-report.md. -->

## Dependencies
- PROJ-1 (Repo-Übersicht) — liefert die Navigation zur Detailroute `/repos/{owner}/{repo}` und den GitHub-Client

## User Stories
- Als Nutzer möchte ich beim Öffnen eines Repos die letzten Commits sehen, um die jüngste Aktivität nachzuvollziehen.
- Als Nutzer möchte ich die offenen PRs eines Repos sehen, um zu wissen, was gerade läuft.
- Als Nutzer möchte ich auch die zuletzt geschlossenen/gemergten PRs sehen, um den Verlauf einschätzen zu können.
- Als Nutzer möchte ich von der Detailansicht einfach zur Repo-Übersicht zurückkommen.
- Als Nutzer möchte ich eine klare Meldung sehen, wenn ein Repo nicht existiert oder für meinen Token nicht sichtbar ist, statt eines kaputten Bildschirms.

## Out of Scope
- Schreibende Aktionen (Kommentieren, Mergen, Reviewen) — laut PRD-Non-Goals nie Teil des Tools
- Datei-Browser/Code-Ansicht des Repos — ursprünglicher Scope ist "Name, PRs, Commits, Historie", kein Code-Viewer
- Vollständige Commit-Historie mit Pagination — MVP zeigt die letzten 20 Commits, ältere über einen Link zu GitHub selbst
- Diff-Ansicht einzelner Commits — nur Liste mit Titel/Autor/Zeitpunkt
- Branch-Auswahl — zeigt immer den Default-Branch
- Suche/Filter innerhalb der Commit-/PR-Listen — kein AC dafür in dieser Version

## Acceptance Criteria

- [ ] **AC-1** — Angenommen ein gültiger Token und ein existierendes, für den Token sichtbares Repo, wenn die Detailseite geladen wird, dann werden die letzten 20 Commits des Default-Branch angezeigt (Message-Titel, Autor, relativer Zeitpunkt), neueste zuerst
- [ ] **AC-2** — Angenommen dasselbe, wenn die Detailseite geladen wird, dann werden die offenen PRs angezeigt (Titel, Autor, relativer Zeitpunkt), neueste zuerst
- [ ] **AC-3** — Angenommen dasselbe, wenn die Detailseite geladen wird, dann werden zusätzlich die letzten 10 geschlossenen/gemergten PRs angezeigt, sichtbar getrennt von den offenen
- [ ] **AC-4** — Angenommen der Nutzer ist auf der Detailseite, wenn er auf den Zurück-Link im Seitenkopf klickt, dann gelangt er zur Repo-Übersicht ("/") zurück
- [ ] **AC-5** — Angenommen das aufgerufene Repo existiert nicht oder ist für den konfigurierten Token nicht sichtbar, wenn die Seite geladen wird, dann wird eine klare "nicht gefunden"-Meldung angezeigt statt eines Absturzes oder einer leeren Seite
- [ ] **AC-6** — Angenommen die GitHub-API antwortet mit einem Rate-Limit- oder Netzwerkfehler, wenn die Detailseite geladen wird, dann wird eine Fehlermeldung mit Retry-Möglichkeit angezeigt (analog PROJ-1 AC-6)
- [ ] **AC-7** — Angenommen die Daten werden noch geladen, wenn die Seite aufgerufen wird, dann wird ein Skeleton-Ladezustand anstelle der echten Inhalte angezeigt
- [ ] **AC-8** — Angenommen ein Repo hat keine offenen PRs, wenn die Seite geladen wird, dann zeigt der PR-Bereich einen erklärenden Leerzustand statt einer leeren Fläche
- [ ] **AC-9** — Angenommen ein Repo hat noch keine Commits (leeres Repo), wenn die Seite geladen wird, dann zeigt der Commit-Bereich einen erklärenden Leerzustand

## Edge Cases
- **EC-1** — Angenommen ein Commit hat keine strukturierte Autor-Info (z. B. gelöschter oder externer Account ohne GitHub-Verknüpfung), wenn er angezeigt wird, dann wird ein neutraler Platzhalter statt eines leeren oder kaputten Elements gezeigt
- **EC-2** — Angenommen eine Commit-Message ist mehrzeilig, wenn sie angezeigt wird, dann wird nur die erste Zeile prominent gezeigt, der Rest wird abgeschnitten (kein Layout-Bruch durch sehr lange Messages)
- **EC-3** — Angenommen zwei Ladevorgänge überschneiden sich (z. B. schnelles Neuladen), wenn die zweite Antwort eintrifft, dann zeigt die UI konsistent nur die Daten der zuletzt gestarteten Anfrage (analog PROJ-1 EC-3)
- **EC-4** — Angenommen die owner/repo-Kombination in der URL ist ungültig formatiert oder enthält Sonderzeichen, wenn die Seite aufgerufen wird, dann wird das wie AC-5 (nicht gefunden) behandelt statt eines Server-Fehlers

## Technical Requirements (optional)
- Security: GitHub-Token wird ausschließlich serverseitig gehalten, wie bereits in PROJ-1 etabliert
- Performance: unkritisch — rein lokales Ein-Personen-Tool

## Open Questions
- Keine offenen Fragen — Feature wurde im Auto-Mode ohne interaktives Interview entschieden (siehe Decision Log), auf ausdrücklichen Wunsch des Nutzers ("autonom fertig bauen, nicht schrittweise")

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Letzte 20 Commits, letzte 10 geschlossene PRs als Obergrenze | Reicht für einen "was ist zuletzt passiert"-Überblick; volle Historie bleibt bewusst GitHub selbst überlassen (siehe PRD: "keine eigene Datenhistorie über das hinaus, was die GitHub-API selbst liefert") | 2026-08-28 |
| Nur Default-Branch, keine Branch-Auswahl | Deckt den in der Idee genannten Bedarf ("Überblick") ab, ohne die UI zu verkomplizieren; kann bei Bedarf später als eigenes Feature nachgerüstet werden | 2026-08-28 |
| Offene und geschlossene PRs getrennt, aber auf derselben Seite (kein Tab-Wechsel als eigener AC) | Beides ist Teil des "Überblicks laut ursprünglicher Idee ("PRs, Commits, Historie") | 2026-08-28 |
