import { z } from "zod";
import { getServerPostHog, SERVER_POSTHOG_ENVIRONMENT } from "@/lib/posthog-server";

/**
 * Registry der Server-Side-Mutations-Events. Pro Event-Name wird ein
 * Zod-Schema definiert — Properties werden vor dem Capture validiert,
 * fehlerhafte Properties werden silent verworfen (nie User-Latenz blockieren).
 *
 * Hintergrund: docs/architektur/observability.md (Abschnitte 1 und 2).
 *
 * Beispiele zum Loslegen — füge eigene Events hinzu, die zu deinem
 * Domänen-Modell passen. Trigger-Punkte sind Server Actions, API-Routes
 * und Cron-Jobs (bei Cron: explizit `await shutdownServerPostHog()` rufen).
 */
export const TRACKED_MUTATIONS = {
  // Beispiel — anpassen oder entfernen:
  user_invited: z.object({
    invited_user_id: z.string().uuid(),
    invited_by_user_id: z.string().uuid(),
    role: z.string(),
  }),
} as const;

export type TrackedMutationName = keyof typeof TRACKED_MUTATIONS;

/**
 * Quelle des Events:
 * - `web` — Cookie-Auth-Routen (User in Browser eingeloggt)
 * - `api-v1` — API-Key-basierte Routen ohne User-Session
 * - `system` — Cron-Jobs, Migrations, Background-Tasks
 *
 * Filter `source` ist auf jedem Event verfügbar — nutze ihn in PostHog,
 * um Mensch- vs. KI-Aktivität zu trennen.
 */
export type TrackSource = "web" | "api-v1" | "system";

export interface TrackContext {
  /**
   * Distinct-ID-Strategie (docs/architektur/observability.md, Abschnitt 1):
   * - Cookie-Auth: Supabase-User-ID
   * - API-v1: `api-key:<api_key_id>` (synthetic, getrennt von menschlichen Usern)
   * - System: `system:<context>` (z. B. `system:cron-cleanup`)
   */
  distinctId: string;
  source: TrackSource;
  /**
   * Optional: Group-Analytics-Key (z. B. team-/tenant-/department-ID).
   * In PostHog als "team"-Group registriert.
   */
  groupKey?: string;
}

/**
 * Trackt eine Server-Side Mutation. Fire-and-forget — der Caller wartet
 * NICHT auf die HTTP-Anfrage zu PostHog (Flush-Strategie: docs/architektur/observability.md, Abschnitt 2).
 */
export function trackMutation<N extends TrackedMutationName>(
  name: N,
  properties: z.infer<(typeof TRACKED_MUTATIONS)[N]>,
  context: TrackContext,
): void {
  const client = getServerPostHog();
  if (!client) return;

  const schema = TRACKED_MUTATIONS[name];
  const parsed = schema.safeParse(properties);
  if (!parsed.success) return;

  const groups = context.groupKey ? { team: context.groupKey } : undefined;

  client.capture({
    distinctId: context.distinctId,
    event: name,
    properties: {
      ...parsed.data,
      environment: SERVER_POSTHOG_ENVIRONMENT,
      source: context.source,
    },
    groups,
  });
}
