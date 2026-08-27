# Performance-Patterns

> Best-Practices aus produktiver Erfahrung — extrahiert aus einem internen
> Vorgaengerprojekt und dort gemessen.

## Was im Starter-Kit bereits aktiv ist

### Server-Region (Bündel A aus PROJ-40)
**Datei:** [vercel.ts](../../vercel.ts) — `regions: ["fra1"]`

Alle Vercel-Functions laufen in Frankfurt, co-located mit Supabase eu-central-1.
Der transatlantische Roundtrip auf jeder Server-Component-Query entfällt.

**Impact (produktiv gemessen, 2026-04-30):** TTFB cold P50 −66 % bis −78 %
auf allen Server-rendered Routes (Home: 2030 → 572 ms, Bereich: 1441 → 447 ms).

**Wenn dein Stack nicht in der EU liegt:** Region in `vercel.ts` anpassen — Liste:
https://vercel.com/docs/regions. Faustregel: gleiche Region wie deine Datenbank.

### Image-Optimizer (Bündel C aus PROJ-40)
**Datei:** [next.config.ts](../../next.config.ts) — `images.remotePatterns` whitelistet
automatisch den Hostname aus `NEXT_PUBLIC_SUPABASE_URL`.

Sobald du `<Image src={supabaseStorageUrl} />` benutzt (ohne `unoptimized`), liefert
der Vercel-Image-Optimizer AVIF/WebP, srcset, Edge-CDN-Cache.

**Impact (produktiv gemessen):** LCP Home Desktop warm 6168 → 884 ms (−86 %),
Bandbreite pro Card 64 KB → 9 KB (~7× kleiner).

**Restriktiv per Default:** Nur der konkrete Supabase-Project-Hostname + Public-Storage-Pfad
sind whitelisted, kein Wildcard. Falls du andere Image-Quellen brauchst, ergänze in
`next.config.ts`.

### Request-Scoped Caching mit `react.cache`
Bereits angewandt in [src/lib/kuma-status-page.ts](../../src/lib/kuma-status-page.ts):
```ts
import { cache } from "react";
export const fetchKumaStatusPage = cache(async () => { ... });
```

**Pattern:** Server-side Read-Helper, die im selben Render-Request mehrfach aufgerufen werden
können (Auth-Check, Profile-Load, etc.), in `cache()` wrappen → DB/HTTP-Roundtrips werden
pro Request einmal ausgeführt statt N-fach.

**Wann verwenden:** Auth-Helper, Profile-Lookups, Konfig-Reads — alles was sich innerhalb eines
Requests garantiert nicht ändert.

**Wann NICHT:** Mutations, Cross-Request-State (dafür `unstable_cache` mit Tags, oder externe
Cache-Schicht).

## Patterns die du selbst aktivieren musst

### Sidebar / Long-List `prefetch={false}` (Bündel B aus PROJ-40)

Next.js prefetcht Default-mäßig jeden im Viewport sichtbaren `<Link>`. Bei einer Sidebar
mit 22 Links = 22 zusätzliche RSC-Function-Invocations pro Cold-Load — pro User, pro Login.

**Wann anwenden:** Sidebars, Tab-Bars, Mega-Menüs — Listen wo der User selten alle Items klickt.

```tsx
<Link href="/admin/users" prefetch={false}>Users</Link>
```

**Impact (produktiv gemessen):** RSC-Prefetches pro Cold-Load 22-44 → 0. Sekundär: Browser-CPU-Entlastung
beim RSC-Parsing (FCP −100 bis −300 ms).

**Was Du behältst:** Klick-Navigation funktioniert weiter — `prefetch={false}` deaktiviert nur
das Vorab-Rendering.

### `priority`-Prop auf Above-the-fold Bilder (Bündel C aus PROJ-40)

Erste 4–6 Bilder above-the-fold sollten `priority` bekommen, damit der Browser sie eager lädt
und LCP nicht auf Lazy-Load wartet:

```tsx
<Image
  src={url}
  alt={...}
  priority={index < 4}
  sizes="(max-width: 768px) 100vw, 252px"
  fill
/>
```

### Server-HTML statt Client-React für Read-Only-Anzeige

Wenn Inhalte read-only gerendert werden (Artikel, SOPs, Doku-Seiten), als Server-Component
rendern statt Client-Component. Der Browser bekommt fertiges HTML, kein React-Hydrate-Pass.

Bereits angewandt in [/admin/status](../../src/app/(authenticated)/admin/status/page.tsx) — die
ganze Seite ist Server-Component, nur das `BadgeImage` mit `onError`-Fallback ist `"use client"`.

**Pattern:** Default Server-Component. `"use client"` nur wenn du `useState`, `useEffect`,
Event-Handler oder Browser-APIs brauchst.

## Verifikation nach Deploy

Performance-Wins sind plattform-spezifisch und nur live messbar. Nach jedem `/deploy`:

1. **Region:** `curl -I https://your-app.vercel.app/api/health | grep x-vercel-id` →
   sollte `fra1::fra1::*` zeigen (oder die gewählte Region)
2. **Image-Optimizer:** DevTools → Network → ein Bild aus deiner App öffnen → URL sollte
   `/_next/image?url=...&w=...&q=...` sein, `Content-Type: image/webp` (oder avif)
3. **Sidebar-Prefetch:** Cold-Load der Home-Page → Network-Tab → keine `?_rsc=`-Anfragen
   zu Sidebar-Targets
4. **TTFB / LCP:** Lighthouse oder PageSpeed Insights — Ziel: TTFB ≤ 800 ms cold, LCP ≤ 2500 ms

## Lighthouse Check (Default-Workflow)

1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select: Performance, Accessibility, Best Practices, SEO
4. Generate Report für Mobile + Desktop
5. **Target:** Score > 90 in allen Kategorien

## Nicht-Goals des Starter-Kits

- **Multi-Region**: Single-Region (`fra1`) ist Default. Multi-Region erhöht Caching-Komplexität
  ohne Mehrwert für DACH-Nutzerbasen. Bei globaler User-Base in `vercel.ts` mehrere Regionen
  setzen.
- **Eigene Image-Pipeline (Sharp + Cloudflare R2)**: Nur sinnvoll wenn Vercel-Image-Quota
  überschritten wird oder du Kosten-Kontrolle brauchst. Default ist Vercel-Optimizer.
- **`unstable_cache` / `revalidateTag`**: Cross-Request-Caching nur einführen wenn
  Request-Frequenz sehr hoch ist und Latenz-Profil das rechtfertigt. Default: `react.cache`
  pro Request.

## Folge-Patterns (für später)

- **Web-Vitals via PostHog:** `web-vitals`-Lib + PostHog-Capture für Field-Daten zu
  CWV. Skill `/observability` deckt das ab, wenn benötigt.
- **Edge-API-Routes:** Für Public-Read-Endpoints (z. B. `/api/health`) bringt Edge-Runtime
  niedrigere Cold-Starts. Aktuell nicht voreingestellt — kann pro Route mit
  `export const runtime = "edge"` aktiviert werden.
- **Vercel Analytics + Speed Insights**: One-click Activation im Vercel-Dashboard, liefert
  Real-User-Daten zu Core Web Vitals.
