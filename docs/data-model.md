# Datenmodell

> Die projektweite Karte dessen, **welche Daten dieses Produkt verwaltet und wie sie zusammenhängen** — der gemeinsame Bauplan, an dem sich die Tabellen jedes Features orientieren.
>
> - Erstellt von `/init` (der erste ganzheitliche Durchgang: Entitäten + Beziehungen).
> - Verfeinert von `/architecture`, während jedes Feature entworfen wird.
> - **Flughöhe:** Entitäten, Beziehungen und Besitzverhältnisse gehören hierher (Produkt-Ebene, für alle lesbar). Spaltentypen, Indizes und exakte Fremdschlüssel werden pro Feature in dessen `design.md` entschieden — nicht hier.

## Entitäten

_Jede Entität ist eine Art von Ding, das die App verwaltet (ein Substantiv aus der realen Welt). Hier alle bekannten mit einem kurzen Zweck und wer sie besitzt oder einsehen kann._

| Entität | Was sie darstellt | Besitzer / wer sieht sie |
|---------|--------------------|---------------------------|
| Repository | Ein GitHub-Repo des Nutzers — Name, Sprache, zuletzt aktualisiert, Anzahl offener PRs | Live von der GitHub-API, nicht persistiert; nur der Nutzer selbst |
| PullRequest | Eine PR innerhalb eines Repos — Titel, Status (offen/geschlossen), Autor, Datum | Live von der GitHub-API, nicht persistiert; nur der Nutzer selbst |
| Commit | Ein Commit innerhalb eines Repos — Message, Autor, Datum, Hash | Live von der GitHub-API, nicht persistiert; nur der Nutzer selbst |

## Beziehungen

_Wie die Entitäten zusammenhängen, in einfachen Worten. Hier entsteht Kohärenz — die Verbindungen einmal am Anfang richtig hinbekommen._

- Ein Repository hat viele PullRequests
- Ein Repository hat viele Commits
- Es gibt keine eigene Datenbank: alle drei Entitäten werden bei jedem Aufruf live von der GitHub-API geladen, nichts wird lokal gespeichert

## Diagramm (optional)

```
Repository
  ├─ hat viele PullRequests
  └─ hat viele Commits
```

---

_Dies ist ein lebendes Dokument. Wenn `/architecture` ein Feature entwirft, das eine Entität einführt oder ändert, aktualisiert es zuerst diese Karte, damit spätere Features auf einem korrekten Bild aufbauen._
