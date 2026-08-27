/**
 * Content-Security-Policy und Permissions-Policy.
 *
 * Warum hier und nicht in `next.config.ts`: Die CSP haengt vom Request ab (das
 * Nonce im strikten Modus). Statische Header aus der Config koennen das nicht.
 * Die vier unveraenderlichen Header (X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, HSTS) bleiben deshalb dort.
 *
 * ─── Zwei Modi, und warum ────────────────────────────────────────────────
 *
 * Der Guide in docs/production/security-headers.md empfiehlt Nonce plus
 * `strict-dynamic` — richtig, und er nennt auch die Bedingung: Nonces
 * erzwingen **dynamisches Rendering**, weil eine statisch vorgerenderte Seite
 * keinen Per-Request-Token haben kann. Seiten steigen dafuer mit
 * `await connection()` aus `next/server` aus dem statischen Rendering aus.
 *
 * Diese Basis rendert alle Routen statisch (`○ (Static)`). Nonce + strict-dynamic
 * ohne Umstellung ergibt deshalb: Das HTML traegt Scripts ohne Nonce, waehrend
 * `strict-dynamic` das Host-Allowlisting abschaltet — jedes Script faellt durch.
 * Nachgemessen: 16 CSP-Verstoesse auf der Startseite, Seite ohne jede
 * Interaktivitaet.
 *
 * Fuer eine Vorlage ist "alles dynamisch" der falsche Default — das kostet jedes
 * darauf gebaute Projekt die statische Optimierung. Daher zwei Modi:
 *
 *   CSP_STRICT nicht gesetzt (Voreinstellung)
 *     script-src 'self' 'unsafe-inline' — funktioniert mit statischem Rendering.
 *     Schuetzt gegen Scripts von fremden Hosts, gegen eval, gegen Clickjacking,
 *     gegen Formular-Hijacking und gegen Datenabfluss ueber connect-src.
 *     Schuetzt NICHT gegen injizierte Inline-Scripts — das ist der Preis.
 *
 *   CSP_STRICT=true
 *     Nonce + strict-dynamic, wie im Guide. Setzt voraus, dass die betroffenen
 *     Seiten dynamisch rendern (`await connection()` im Layout oder pro Route).
 *
 * Beim Umschalten wie im Guide vorgehen: erst als
 * `Content-Security-Policy-Report-Only` ausliefern, durchklicken, Konsole auf
 * "violates the following Content Security Policy" pruefen, dann scharfschalten.
 * Viele Meldungen zu `/_next/static/…` heissen: eine Seite rendert noch statisch.
 */

const STRICT = process.env.CSP_STRICT === "true";

/**
 * Origin des Supabase-Projekts, abgeleitet aus der oeffentlichen URL.
 *
 * ⚠️ `NEXT_PUBLIC_*` wird zur **Build-Zeit** ins Bundle inlined, auch in der
 * Middleware. Die Variable zur Laufzeit zu setzen bleibt wirkungslos — sie muss
 * beim Build gesetzt sein. Das gilt ohnehin fuer den Supabase-Client im
 * Browser; fehlt sie, ist die App unabhaengig von der CSP kaputt.
 */
function supabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function scriptSrc(nonce: string, isDev: boolean): string {
  const evalOk = isDev ? " 'unsafe-eval'" : "";
  return STRICT
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalOk}`
    : `script-src 'self' 'unsafe-inline'${evalOk}`;
}

export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = supabaseOrigin();

  const connect = ["'self'", supabase, isDev ? "ws: wss:" : null]
    .filter(Boolean)
    .join(" ");
  const img = ["'self'", "blob:", "data:", supabase].filter(Boolean).join(" ");

  return [
    `default-src 'self'`,
    scriptSrc(nonce, isDev),

    // Bewusst 'unsafe-inline' — und bei Styles ist das vertretbar.
    // Next und next/font setzen inline <style>-Bloecke ohne Nonce; mit reinem
    // 'self' bleibt die Seite ungestylt. Inline-CSS kann keinen Code ausfuehren.
    // Bei Scripts waere derselbe Wert eine ganz andere Nummer.
    `style-src 'self' 'unsafe-inline'`,

    `img-src ${img}`,
    `font-src 'self' data:`,

    // PostHog laeuft ueber den /ingest-Rewrite und ist damit same-origin.
    // Supabase braucht seinen Origin explizit (REST, Auth, Realtime).
    `connect-src ${connect}`,

    // Session-Recording von PostHog nutzt einen Blob-Worker.
    `worker-src 'self' blob:`,

    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Erlaubt keiner Herkunft Zugriff auf die genannten Browser-Funktionen. */
export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "interest-cohort=()",
].join(", ");

/**
 * Setzt die CSP auf die Request-Header und gibt sie zurueck.
 *
 * Der Request-Header ist im strikten Modus nicht optional: Next liest das Nonce
 * aus der CSP der *eingehenden* Header, um es an seine Script-Tags zu haengen.
 * Im Standardmodus schadet er nicht.
 */
export function applySecurityHeaders(
  requestHeaders: Headers,
  nonce: string,
): string {
  const csp = buildCsp(nonce);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return csp;
}
