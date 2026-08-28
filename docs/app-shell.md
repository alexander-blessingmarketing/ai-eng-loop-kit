# App-Shell & Navigation

> Die projektweite Karte des **Rahmens, in dem jedes Feature angezeigt wird** — Navigation, Layout-Regionen und die Muster, die jede Seite wiederholt.
>
> - Erstellt von `/init` (der erste ganzheitliche Durchgang: Top-Level-Bereiche + Layout).
> - Verfeinert von `/architecture`, während jedes Feature entworfen wird.
> - **Flughöhe:** Struktur, nicht Styling. Farben, Fonts und Komponenten-Styling gehören in `docs/design-system.md`.

## Owning Feature

Owner: keine — Shell ist trivial. Das Tool besteht aus einer Repo-Liste (PROJ-1) mit Drilldown in eine Repo-Detailansicht (PROJ-2). Keine Accounts, kein signed-in/signed-out-Unterschied, keine separate Navigationsebene.

## Top-Level-Bereiche

| Bereich | Was der Nutzer dort tut | Sichtbar für | Owning Feature |
|---------|---------------------------|---------------|-----------------|
| Repo-Liste | Alle Repos auf einen Blick, sortiert nach zuletzt aktualisiert | Nur der Nutzer (lokal) | PROJ-1 |
| Repo-Detail | Commit-Historie und PR-Liste eines einzelnen Repos | Nur der Nutzer (lokal) | PROJ-2 |

## Layout-Regionen

- **Sidebar:** keine — kein Bedarf bei nur zwei Ansichten
- **Header:** Seitentitel (Repo-Name in der Detailansicht), kein primärer Action-Button nötig
- **Content:** die Repo-Liste bzw. das Repo-Detail
- **Mobile:** nicht relevant, rein lokales Desktop-Tool

## Seiten-Muster

- **Seitenkopf:** Titel ("Repos" bzw. der Repo-Name), kein primärer Action-Button
- **Ladezustand:** pulsierendes Skeleton in Panel-Farbe (siehe `docs/design-system.md`)
- **Leerzustand:** monospace-Hinweistext, dezent — z. B. "Keine Repos gefunden"
- **Fehlerzustand:** dezente Fehlermeldung mit Retry-Möglichkeit (z. B. GitHub-API nicht erreichbar / Rate-Limit erreicht)
- **Toasts / Feedback:** nicht nötig — keine schreibenden Aktionen

## Auth-Zustände

Entfällt — kein Login, kein Unterschied zwischen signed-in/signed-out.

## Shell-Komponenten

| Komponente | Datei | Zweck |
|-----------|------|---------|
| PageHeader | `src/components/page-header.tsx` | Einheitlicher Seitenkopf (Titel, optionaler Action-Button) — von PROJ-1 und PROJ-2 geteilt |
| ErrorState | `src/components/error-state.tsx` | Einheitliche Fehleranzeige mit Retry-Button — von PROJ-1 und PROJ-2 geteilt |
| EmptyState | `src/components/empty-state.tsx` | Einheitlicher Leerzustand-Hinweistext — von PROJ-1 und PROJ-2 geteilt |

---

_Dies ist ein lebendes Dokument. Verhaltensänderungen an der Shell laufen über `/refine` auf dem jeweiligen Feature._
