# PROJ-1 — Technisches Design

> Dies ist das technische Design (WIE) für das Feature. Zwei Leser: der PM (muss genehmigen) und `/build` (implementiert danach). Kein Code — aber implementierungsgenau: jedes Feld mit Typ und Constraints, Zugriff/Besitz explizit, Zustände explizit benannt.
> Owner: `/architecture`. Der Vertrag (WAS) lebt in `spec.md`; die Task-Liste in `tasks.md`.

## Komponenten-Struktur

```
Repo-Liste (Seite "/")
├─ PageHeader ("Repos")
├─ ErrorState        (bei AC-5/AC-6: fehlender/ungültiger Token, Rate-Limit, Netzwerkfehler — mit Retry-Button)
├─ LoadingState       (Skeleton-Karten, solange die Liste lädt — AC-4)
├─ EmptyState         (keine aktiven Repos — AC-3)
└─ RepoList
    └─ RepoCard (pro Repo, klickbar → navigiert zur Detailansicht, AC-7)
        ├─ Name + Sichtbarkeits-Badge (privat/öffentlich)
        ├─ Sprach-Label (oder neutraler Platzhalter — EC-2)
        ├─ Offene-PRs-Zähler
        └─ "zuletzt aktualisiert" (relative Zeit)
```

Nur genau einer der vier Zustände (Error / Loading / Empty / RepoList) ist zu einem Zeitpunkt sichtbar.

## Datenmodell

Kein Datenbank-Backend — alle Daten werden bei jedem Seitenaufruf live von der GitHub-API geladen und nicht gespeichert (siehe `docs/data-model.md` → Entität `Repository`).

```
Pro Repo (nur im Server-Response-Zyklus vorhanden, nichts wird persistiert):
- id: GitHub-Repo-ID (Zahl, eindeutig)
- name: Text, Repo-Name
- fullName: Text, Format "owner/name"
- visibility: einer von "private" | "public"
- language: Text oder null (Primärsprache; null wenn GitHub keine erkennt)
- openPRCount: Ganzzahl ≥ 0
- updatedAt: Zeitstempel (ISO 8601) — Sortiergrundlage
- isArchived: boolean — dient nur zum serverseitigen Herausfiltern, wird nicht angezeigt
- isFork: boolean — dient nur zum serverseitigen Herausfiltern, wird nicht angezeigt

Zugriff: nur der lokale Nutzer (Ein-Personen-Tool, kein Multi-User, keine RLS nötig — keine Datenbank vorhanden).
Aufbewahrung: entfällt — keine Persistenz, keine Historie über den einzelnen Request hinaus.
```

## Verhalten & Zugriff

```
Operationen:
- GET Repo-Liste (Route Handler `GET /api/repos`)
  - Ruft serverseitig GitHub REST API `/user/repos` mit dem konfigurierten Personal Access Token auf
  - Paginiert automatisch über alle Seiten, bis alle Repos geladen sind (EC-1)
  - Filtert Repos mit isArchived=true oder isFork=true heraus (Product Decision aus spec.md)
  - Holt pro verbleibendem Repo zusätzlich die Anzahl offener PRs (`/repos/{owner}/{repo}/pulls?state=open`)
  - Sortiert absteigend nach updatedAt
  - Gibt die fertige Liste als JSON zurück

Es gibt keine schreibenden Operationen — das Tool ist rein lesend (siehe PRD Non-Goals).

Fehlerfälle (vom Route Handler strukturiert zurückgegeben, nie als rohe Exception):
- Kein Token konfiguriert ODER GitHub antwortet mit 401 → Fehlertyp "token" (AC-5)
- GitHub antwortet mit 403 + Rate-Limit-Header ODER die Anfrage schlägt netzwerkseitig fehl → Fehlertyp "unavailable", Client zeigt Retry (AC-6)
- GitHub liefert 200 mit leerer Liste → kein Fehler, wird wie AC-3 behandelt (EC-4)
```

## Dependencies

Keine neuen externen Pakete nötig:
- `fetch` (nativ in Next.js Route Handlers) — reicht für die wenigen GitHub-REST-Endpunkte, die dieses Feature braucht
- `Intl.RelativeTimeFormat` (nativ in JS) — für die relative Zeitanzeige ("vor 3 Stunden")
- Bestehende shadcn/ui-Komponenten: `Card`, `Badge`, `Skeleton`, `Alert`, `Button` (alle bereits im Projekt vorhanden)

## Technische Entscheidungen

| Entscheidung | Begründung | Alternative erwogen | Trade-off | Datum |
|---|---|---|---|---|
| Next.js Route Handler (`/api/repos`) als Proxy zur GitHub-REST-API statt direktem Client-Fetch | Hält den GitHub-Token ausschließlich serverseitig, nie im Browser (AC-8) | Client ruft GitHub-API direkt mit im Client eingebettetem Token | Ein zusätzlicher Server-Hop pro Request, aber die einzige Option ohne Token-Leck | 2026-08-28 |
| Direkter `fetch` gegen die GitHub-REST-API statt eines SDK | Nur zwei einfache Endpunkte nötig (`/user/repos`, `.../pulls`) — kein SDK-Overhead gerechtfertigt | `octokit`/`@octokit/rest` | Pagination und Fehlerbehandlung müssen selbst geschrieben werden (betrifft EC-1) | 2026-08-28 |
| `Intl.RelativeTimeFormat` (nativ) statt einer Datumsbibliothek | Vermeidet eine zusätzliche Dependency für eine einzelne Formatierungsaufgabe | `date-fns` | Etwas mehr eigener Code zur Umrechnung in Zeiteinheiten | 2026-08-28 |
| Keine serverseitige Zwischenspeicherung der Repo-Liste zwischen Requests (MVP) | Passt zur PRD-Entscheidung "live von der API, keine Persistenz"; GitHub erlaubt 5000 Requests/h authentifiziert — für ein Ein-Personen-Tool ausreichend | In-Memory-Cache mit kurzer TTL | Bei sehr häufigem manuellem Neuladen entstehen mehr API-Calls als nötig — bei diesem Nutzungsmuster unkritisch | 2026-08-28 |
| Schutz gegen EC-3 (überlappende Ladevorgänge) über `AbortController`: jeder neue Ladevorgang bricht einen noch laufenden vorherigen Request ab | Garantiert, dass eine langsamere ältere Antwort niemals eine neuere überschreibt | Sequenznummer-Vergleich ohne Abbruch (beide Antworten laufen durch, ältere wird ignoriert) | Abgebrochene Requests verschwenden minimal Serverzeit; Implementierung ist dafür einfacher und robuster | 2026-08-28 |

## Offene Fragen

Keine — alle Punkte sind durch das Product-Decision-Log in `spec.md` und die obigen technischen Entscheidungen abgedeckt.

## Umsetzungsnotizen (aus /build)

- Die Felder `isArchived`/`isFork` aus dem Datenmodell landen nicht im öffentlichen `Repo`-Typ (`src/lib/github/types.ts`) — sie werden nur intern im GitHub-Client zum Filtern gebraucht (`GithubRepoRaw`) und sind für die UI irrelevant. Funktional identisch zum Design, nur sauberer geschnitten.
- **`src/proxy.ts` wurde vom Supabase-Auth-Gate befreit.** Der Scaffold leitete ohne konfiguriertes Supabase alle nicht-öffentlichen Routen auf `/login` um — anfangs nur mit einer Ausnahme für `/api/repos` gepatcht (erste Fassung dieser Notiz), aber die `/login`-Seite selbst blieb erreichbar und hat einen Nutzer beim manuellen Ausprobieren in die Irre geführt ("wo bekomme ich Zugangsdaten her?"). Da dieses Projekt laut PRD dauerhaft kein Login hat, wurde der komplette Auth-Gate entfernt (nur noch Security-Header, kein Redirect mehr) und `src/app/login/` sowie das leere `tests/auth.spec.ts` (Kit-Scaffold-Test für die jetzt gelöschte Seite) gelöscht. `src/lib/supabase-server.ts`/`rate-limit.ts` blieben unangetastet, da `/api/health` sie weiter nutzt.
