import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  applySecurityHeaders,
  generateNonce,
  PERMISSIONS_POLICY,
} from "@/lib/security-headers";

// Routes that don't require authentication.
// Erweitern: füge Pfade hinzu, die public bleiben sollen (z. B. /signup, /landing).
const publicRoutes = [
  "/",
  "/login",
  "/api/health",

  // Dateien, die per Definition ohne Anmeldung erreichbar sein muessen.
  //
  // Der Matcher unten schliesst nur Bilder und /_next aus — eine .txt oder .xml
  // laeuft also durch den Auth-Check. Ohne diese Eintraege lieferte
  // /robots.txt eine Weiterleitung auf /login: Die Datei, die Crawlern sagt,
  // was sie duerfen, war fuer Crawler unerreichbar.
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",

  // Domain-Verifizierung, ACME-Challenges (Let's Encrypt), Apple Universal
  // Links. isPublic() matcht auch Unterpfade, deckt also /.well-known/** ab.
  "/.well-known",
];

function isPublic(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Ist Supabase brauchbar konfiguriert — nicht nur "irgendein Wert gesetzt"?
 *
 * `.env.local.example` liefert Platzhalter (`dein-anon-key`,
 * `https://kuma.example.com`). Wer die Datei kopiert und noch nicht ausgefuellt
 * hat, hat gesetzte Variablen mit unbrauchbarem Inhalt. Eine reine
 * Anwesenheitspruefung faellt darauf herein.
 */
function supabaseKonfiguriert(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, key };
}

/** Setzt die Per-Request-Header auf eine fertige Response. */
function withSecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nonce und CSP werden fuer JEDEN Durchlauf erzeugt — auch fuer oeffentliche
  // Routen. Die Startseite und /login ungeschuetzt zu lassen waere genau
  // verkehrt: Das sind die Seiten, die jeder ohne Anmeldung erreicht.
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  const csp = applySecurityHeaders(requestHeaders, nonce);

  if (isPublic(pathname)) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // Ohne brauchbares Supabase kann niemand angemeldet sein. Vorher warf
  // createServerClient hier ("Invalid supabaseUrl") und jede geschuetzte Route
  // antwortete mit 500 — auch in einem Frontend-only-Projekt, das gar kein
  // Supabase haben soll.
  //
  // Geprueft wird nicht blosse Anwesenheit, sondern Brauchbarkeit: Eine frisch
  // aus .env.local.example kopierte Datei enthaelt Platzhalter. Die sind gesetzt
  // und trotzdem kein gueltiger URL — genau der Fall, der hier krachte.
  //
  // Auf /login umleiten statt durchlassen: Das ist dasselbe Ergebnis wie "kein
  // User" und damit die sichere Richtung. Ein Durchlassen waere fail-open — bei
  // kaputter Env in Produktion waeren schlagartig alle Routen oeffentlich.
  const supabaseConf = supabaseKonfiguriert();
  if (!supabaseConf) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      csp,
    );
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    supabaseConf.url,
    supabaseConf.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      csp,
    );
  }

  return withSecurityHeaders(response, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
