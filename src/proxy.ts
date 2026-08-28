import { type NextRequest, NextResponse } from "next/server";
import {
  applySecurityHeaders,
  generateNonce,
  PERMISSIONS_POLICY,
} from "@/lib/security-headers";

/**
 * Dieses Projekt hat kein Login/Accounts (siehe docs/PRD.md → Constraints:
 * "Kein Login/Accounts" — rein lokales Ein-Personen-Tool, Zugriff auf GitHub
 * über einen Personal Access Token statt Nutzer-Auth). Der Proxy setzt deshalb
 * nur noch die Security-Header auf jeden Request, ohne Auth-Gate.
 */
export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  const csp = applySecurityHeaders(requestHeaders, nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
