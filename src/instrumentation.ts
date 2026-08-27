/**
 * Next.js Instrumentation Hook — wird einmal pro Function-Boot aufgerufen.
 * Lädt server-seitige Setup-Logik (OTel-Logger, beforeExit-Hooks etc.)
 * nur in Production + nur in der Node.js-Runtime.
 *
 * Hintergrund: docs/architektur/observability.md (Abschnitt 3).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  await import("./instrumentation-node");
}
