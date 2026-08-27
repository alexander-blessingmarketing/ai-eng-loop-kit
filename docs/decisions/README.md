# Architecture Decision Records (ADRs)

Hier dokumentierst **du** die Entscheidungen **deines** Projekts. Der Ordner startet bewusst leer — die Basis bringt keine ADRs mit.

## Warum leer?

Ein ADR hält fest: *„Wir haben in Situation Y am Datum Z Entscheidung X getroffen, aus diesen Gründen, mit diesen Konsequenzen."* Das ist projektbezogen. Eine Basis hat kein Situation Y.

Würde die Basis ADRs mitliefern, erbte jedes Projekt Entscheidungen, die jemand anders in einem anderen Kontext getroffen hat — und begänne seine eigene Nummerierung irgendwo in der Mitte. Genau so entstand im Vorgänger-Kit ein Index, dessen Einträge Code beschrieben, den es dort nie gab.

**Was die Basis mitliefert, ist erklärt — aber als Referenz, nicht als Entscheidung:** siehe [`docs/architektur/`](../architektur/). Diese Dokumente beschreiben, *warum der ererbte Code so aussieht*. Sie sind nicht dein Beschluss und du darfst sie ersetzen, sobald du es anders machst.

## Dein erster ADR ist `0001`

Nummeriere fortlaufend, unabhängig von allem, was die Basis mitgebracht hat.

## Abgrenzung: ADR oder Feature-Doku?

Das Kit führt Entscheidungen bereits **pro Feature**:

| Ort | Was | Gepflegt von |
|-----|-----|--------------|
| `features/PROJ-X-*/spec.md` | Product Decisions (Decision \| Rationale \| Date) | `/write-spec`, `/refine` |
| `features/PROJ-X-*/design.md` | Technical Decisions (Decision \| Rationale \| Alternative \| Trade-off \| Date) | `/architecture` |
| `docs/decisions/` | Querschnittliches | du, von Hand |

**Faustregel:** Betrifft die Entscheidung genau ein Feature, gehört sie in dessen `design.md`. Betrifft sie alles Nachfolgende — Caching-Strategie, Auth-Modell, Logging-Stack, Mandantentrennung —, wird sie ein ADR.

Im Zweifel: `design.md`. Ein ADR zu viel kostet mehr Pflege als er einbringt.

## Wann sich ein ADR lohnt

- Technologie-Auswahl mit Wirkung über ein Feature hinaus
- Architektur-Muster, die künftige Features übernehmen sollen
- Wichtige Trade-offs (Performance vs. Einfachheit, Konsistenz vs. Verfügbarkeit)
- Bewusste Abweichungen von Standard-Patterns
- Sicherheitsentscheidungen mit Fundamentcharakter

## Format

`XXXX-titel.md`, Vorlage: [TEMPLATE.md](TEMPLATE.md).

## Status-Werte

- **Vorgeschlagen** — steht zur Diskussion
- **Akzeptiert** — gilt
- **Veraltet** — nicht mehr relevant
- **Ersetzt** — durch einen neueren ADR abgelöst (Verweis angeben)

Ein ADR wird **nie** nachträglich umgeschrieben. Ändert sich die Entscheidung, bekommt der alte den Status *Ersetzt* und ein neuer wird geschrieben. Die Historie ist der Sinn der Sache.

## Index

_Noch keine ADRs. Der erste bekommt die Nummer `0001` und wird hier eingetragen._

| ID | Titel | Status | Datum | Pattern |
|----|-------|--------|-------|---------|
