import { PostHog } from "posthog-node";

declare global {
  var __posthogServerSingleton: PostHog | null | undefined;
}

const SERVER_POSTHOG_HOST = "https://eu.i.posthog.com";

function buildClient(): PostHog | null {
  if (process.env.NODE_ENV !== "production") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  return new PostHog(key, {
    host: SERVER_POSTHOG_HOST,
    flushAt: 5,
    flushInterval: 2000,
  });
}

/**
 * Singleton-PostHog-Client für Server-Side Tracking. Rückgabewert ist `null`
 * außerhalb von Production oder wenn `NEXT_PUBLIC_POSTHOG_KEY` fehlt — alle
 * Caller müssen damit umgehen können (Fire-and-forget bei `null` skippen).
 *
 * Auf Vercel Fluid Compute wird die Function-Instance über mehrere Requests
 * wiederverwendet → der Singleton überlebt zwischen Requests, gepufferte
 * Events werden via `flushInterval: 2000` und `beforeExit`-Hook geflusht.
 *
 * Hintergrund: docs/architektur/observability.md (Abschnitt 2).
 */
export function getServerPostHog(): PostHog | null {
  if (globalThis.__posthogServerSingleton === undefined) {
    globalThis.__posthogServerSingleton = buildClient();
  }
  return globalThis.__posthogServerSingleton ?? null;
}

export async function shutdownServerPostHog(): Promise<void> {
  const client = globalThis.__posthogServerSingleton;
  if (client) await client.shutdown();
}

export const SERVER_POSTHOG_ENVIRONMENT =
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
