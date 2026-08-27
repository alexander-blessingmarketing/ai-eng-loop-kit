# Rate-Limiting — Postgres Fixed Window

> **Referenzdokumentation, kein ADR.** Erklärt Code, den die Basis mitbringt. Eigene Entscheidungen gehören nach `docs/decisions/` (ab `0001`) bzw. in das `design.md` des Features.

## Kontext

Der Login prüft ein Credential und muss gegen Brute-Force geschützt sein. Ohne Limit ist ein Login ein Login, den jeder erraten kann.

Rahmenbedingungen:

- **Serverless.** Vercel Functions ohne dauerhaft laufende Instanz — In-Memory-Zähler überleben Cold Starts nicht und gelten nicht instanzübergreifend.
- **Keine zusätzliche Infrastruktur im Stack.** Kein Redis, kein Upstash. Einzige Persistenz ist Supabase/Postgres.
- **Der Check läuft pre-auth.** Beim Login existiert noch keine Session, `auth.uid()` ist leer. Der Aufrufer kann also keine RLS-gebundene Identität mitbringen.

Supabase Auth begrenzt seine eigenen Endpunkte per IP (`/auth/v1/token`, `/auth/v1/verify` — nicht konfigurierbar). Das deckt den Passwort-Reset ab, der clientseitig direkt gegen Supabase läuft. Es deckt **nicht** ab, was eine eigene Server Action davor tut.

## Umsetzung

Fixed-Window-Zähler in Postgres.

**Tabelle** `public.rate_limits (identifier text, action text, window_start timestamptz, attempts int)`, Primary Key `(identifier, action)`.

**Funktion** `check_and_increment_rate_limit(p_identifier, p_action, p_max_attempts, p_window_seconds) returns boolean`:

1. Sperrt den bestehenden Eintrag per `select … for update` — das macht Prüfen und Inkrementieren atomar.
2. Kein Eintrag → anlegen mit `attempts = 1`, erlauben.
3. Fenster abgelaufen → `window_start` und `attempts` zurücksetzen, erlauben.
4. `attempts >= p_max_attempts` → ablehnen.
5. Sonst inkrementieren, erlauben.

**Zugriffsmodell:** `security definer` mit `set search_path = public`, ausführbar nur für `service_role`. Die Anwendung ruft die RPC über `createAdminClient()` auf — so funktioniert der Check pre-auth, ohne dass die `anon`-Rolle je Zugriff auf die Tabelle braucht.

**Die Tabelle selbst ist gesperrt** — `enable row level security` ohne jede Policy, plus `revoke all … from anon, authenticated`. Ohne das wäre sie über PostgREST mit dem öffentlichen Anon-Key erreichbar, und wer sie leeren kann, setzt seinen eigenen Zähler zurück. Eine Policy wäre hier kontraproduktiv: `service_role` umgeht RLS ohnehin, jede Policy würde nur den anderen Rollen wieder Zugriff öffnen.

**Limits** in `src/lib/rate-limit.ts`:

| Action | Limit |
|---|---|
| `login` | 5 Versuche / 15 Minuten |
| `invite` | 10 Versuche / 60 Minuten |

**Cleanup:** `cleanup_rate_limits()` löscht Einträge älter als 24 h. Aufruf per `pg_cron` optional — bei der erwarteten Menge unkritisch.

## Alternativen

| Option | Vorteile | Nachteile |
|---|---|---|
| **Postgres Fixed Window (gewählt)** | Keine neue Abhängigkeit, kein zusätzlicher Auftragsverarbeiter, atomar durch Zeilensperre | Ein DB-Roundtrip pro Login; Burst am Fensterrand |
| Upstash Redis | Für genau diesen Zweck gebaut, sehr schnell | Zusätzlicher Anbieter, zusätzlicher AVV, Free Tier 10k/Tag |
| Sliding Window in Postgres | Kein Burst-Effekt | Mehr Zustand, mehr Schreiblast — für die erwartete Menge nicht gerechtfertigt |
| In-Memory | Trivial | Auf Serverless schlicht falsch |

## Bewusste Schwächen

Drei Punkte, die diese Lösung nicht abdeckt. Sie sind Trade-offs, keine Versehen — und beim nächsten Auth-Feature neu zu bewerten.

**1. Burst am Fensterrand.** Fixed Window heißt: An der Grenze zweier Fenster sind kurzzeitig bis zu 2× `max` Versuche möglich. Bei 5/15 min also 10 Versuche in wenigen Sekunden. Für Brute-Force-Schutz irrelevant, bei engeren Limits nicht.

**2. Der Schlüssel ist die IP, nicht der Account.** `loginAction` ruft `checkRateLimit(ip, "login")`. Damit läuft ein Angreifer, der IPs rotiert, in kein Limit, und Credential Stuffing (ein häufiges Passwort gegen viele Konten) ebenfalls nicht.

Die Tabelle könnte beides — `identifier` ist freier Text. Ein zweiter Aufruf mit `email:<adresse>` würde die Lücke schließen. Offen, weil bislang kein Feature Auth als Spec beschreibt; gehört in die Acceptance Criteria des Auth-Features.

> **Vertrauensgrenze der IP-Ermittlung.** `x-forwarded-for` ist ein Client-Header und frei setzbar. Wer den **linkesten** Eintrag nimmt, nimmt genau den Wert, den ein Angreifer selbst geschickt hat — und bekommt pro Request einen frischen Bucket. Der Schutz wäre damit nicht nur schwach, sondern wirkungslos.
>
> `getClientIp()` liest deshalb zuerst `x-real-ip` (setzt die Vercel-Edge, vom Client nicht durchreichbar) und fällt sonst auf den **rechtesten** `x-forwarded-for`-Eintrag zurück — den Wert, den der äußerste vertrauenswürdige Proxy angehängt hat.
>
> Bei einem Hosting mit mehreren eigenen Proxy-Schichten stimmt diese Annahme nicht mehr: Dann ist der richtige Eintrag der n-te von rechts, mit n = Zahl der eigenen Proxies. Vor einem Hosting-Wechsel prüfen.

**3. Fail-open.** Schlägt die RPC fehl, gibt `checkRateLimit` `true` zurück — der Request wird erlaubt. Das ist gewollt: Ein DB-Aussetzer soll nicht alle Logins blockieren. Der Preis ist, dass ein dauerhaft kaputtes Rate-Limit unsichtbar bleibt, weil nur `console.error` geschrieben wird. Der Logging-Stack steht (siehe `observability.md`, Abschnitt 3) — hier gehört ein `logger.error` mit `request_id` hin, damit es auffällt.

## Was das im Betrieb bedeutet

- Jeder Login kostet einen zusätzlichen DB-Roundtrip.
- Neue Actions brauchen nur einen Eintrag in `LIMITS` — kein Schema-Wechsel.
- Die Migration ist die einzige Stelle, an der der Tabellenschutz steht. Wird sie je kopiert, muss der RLS-Block mit. Genau das ging beim ursprünglichen Portieren ins Kit verloren und traf dann geklonte Projekte.

## Verweise

- `supabase/migrations/002_rate_limit.sql` — Tabelle, Funktion, Zugriffsschutz
- `src/lib/rate-limit.ts` — Limits und Aufruf
- `src/app/login/actions.ts` — Verwendung im Login
- [observability.md](observability.md) — Logging-Stack, relevant für Schwäche 3
