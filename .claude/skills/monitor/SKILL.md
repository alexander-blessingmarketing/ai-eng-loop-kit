---
name: monitor
description: Use to register a Uptime Kuma HTTP monitor for the project's `/api/health` endpoint via Socket.io. Triggers when the user wants to set up uptime monitoring, after a fresh deploy, or when adding a new public-facing URL. Reads `KUMA_BASE_URL` + `KUMA_USERNAME` + `KUMA_PASSWORD` from `.env.local`.
---

# /monitor — Uptime Kuma Health-Monitor anlegen

## When to use
- Direkt nach erstem `/deploy` in Production.
- Wenn ein neuer öffentlich erreichbarer Endpoint überwacht werden soll.
- User-Trigger: "lege einen Monitor an", "registriere in Kuma", "setup uptime check".

## Wichtig: Wie das technisch läuft
Uptime Kuma hat **keine REST-API** für Monitor-Anlage. Stattdessen Socket.io mit Login:

1. `socket.io-client` verbindet zu `KUMA_BASE_URL`
2. emit `login` mit Username + Password → JWT
3. Server pusht `monitorList` + `notificationList` (Sync) → Idempotenz-Check via Name + Notification-Lookup
4. emit `add` mit Monitor-Config + verknüpften `notificationIDList` → `{ok, msg, monitorID}`
5. emit `getStatusPage` + REST-`/api/status-page/<slug>` → vorhandene Groups laden
6. emit `saveStatusPage` mit erweitertem `publicGroupList` → Monitor in Gruppe einsortiert
7. disconnect

Implementierung in [`scripts/kuma-register.ts`](../../../scripts/kuma-register.ts) + [`scripts/lib/kuma-client.ts`](../../../scripts/lib/kuma-client.ts).

**Notification-Channels:** `KUMA_NOTIFICATION_NAMES` (komma-separiert) wird beim Anlegen automatisch via Name aufgelöst und verknüpft. Der Name muss einem in Kuma angelegten Notification-Channel entsprechen (E-Mail/Slack/Webhook).

**Status-Page-Auto-Grouping:** `KUMA_STATUS_PAGE_SLUG` + `KUMA_STATUS_PAGE_GROUP` (default: Projekt-Name) sorgen dafür, dass jeder neue Monitor automatisch in der Status-Page (z. B. `<kuma>/status/<slug>`) unter einer Gruppe pro Projekt erscheint.

**Wire-Format-Eigenheiten** (aus Reverse-Engineering — uptime-kuma-api-Python-Lib als Referenz):
- `imgDataUrl` muss leerer String `''` sein, nicht `null` (sonst Server-Crash auf `.startsWith()`).
- Neue Gruppen ohne `id`-Feld serialisieren — Kuma vergibt server-seitig.
- `monitorList`-Einträge nur mit `{id, sendUrl}`, sonst FK-Constraint-Fehler.

## Workflow

### 1. Voraussetzungen prüfen
```bash
grep -E '^KUMA_(BASE_URL|USERNAME|PASSWORD)=' .env.local
```
Fehlende Werte über `AskUserQuestion` einholen + per Edit-Tool nach `.env.local` schreiben.

> **Sicherheits-Hinweis:** Bevorzugt einen dedizierten Bot-User in Kuma anlegen (`Settings → Users`), nicht echte Admin-Credentials. Der Bot braucht nur Monitor-Anlage-Rechte.

### 2. App-URL auf aktuellen Stand bringen
`NEXT_PUBLIC_APP_URL` muss auf die produktive URL zeigen (z. B. `https://my-app.vercel.app`). Ohne korrekten Wert wird `localhost:3000` registriert — Kuma kann das nicht reachen.

### 3. Monitor anlegen
```bash
npm run kuma:register
```

**Erfolg:**
- `✅ Monitor angelegt (ID N)` → frisch erzeugt
- `ℹ️ Monitor "…" existiert bereits (ID N) — überspringe.` → idempotent, alles gut

### 4. Verifikation
- `curl -fsS "$NEXT_PUBLIC_APP_URL/api/health"` muss `{"status":"ok"}` zurückgeben.
- Im Kuma-Dashboard sollte der Monitor innerhalb von 60s grün werden.
- Bei Bedarf: `npm run kuma:cleanup _starter-kit-test` entfernt Test-Monitore.

### 5. Doku
Falls `docs/production/monitoring.md` nicht existiert, anlegen mit:
- Kuma-URL + Monitor-Namen + ID
- Interval, Retry, Accepted Status Codes
- Eskalations-Kontakt (wer wird benachrichtigt bei Down?)

## Edge Cases
- **Kuma nicht erreichbar:** Connect-Error reporten. Netzwerk/VPN/Reverse-Proxy prüfen. Beachten dass `socket.io-client` nur `transports: ['websocket']` versucht — falls Kuma hinter Caddy/Cloudflare ohne WS-Support steht: `polling` als Fallback in `kuma-client.ts` ergänzen.
- **Login fehlgeschlagen:** "Incorrect username or password" → Credentials prüfen. 2FA aktiv? Dann zusätzlicher `token`-Parameter nötig (siehe `uptime-kuma-api`-Doku).
- **App-URL noch nicht deployed:** Erst `/deploy` durchführen, dann `/monitor`.
- **Monitor bereits da, aber mit anderer URL:** Skript überspringt nur bei Namens-Match. Bei manueller Korrektur: Monitor in Kuma-UI löschen und neu anlegen, oder `KUMA_MONITOR_NAME` setzen für Suffix.

## Output
Kurze Zusammenfassung mit Monitor-ID, Dashboard-URL, Health-Endpoint + Verifikations-Resultat (Health-Endpoint-Response, erstes Kuma-Heartbeat-Status).
