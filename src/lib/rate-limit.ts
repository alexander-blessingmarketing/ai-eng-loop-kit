import { createAdminClient } from "@/lib/supabase-server";
import { getLogger } from "@/lib/logger";

type RateLimitAction = "login" | "invite";

const LIMITS: Record<RateLimitAction, { max: number; windowSeconds: number }> = {
  login: { max: 5, windowSeconds: 15 * 60 },
  invite: { max: 10, windowSeconds: 60 * 60 },
};

/**
 * Prüft und inkrementiert atomar den Rate-Limit-Counter. Gibt `true` zurück,
 * wenn der Request erlaubt ist, `false` bei Limit-Überschreitung.
 *
 * Nutzt den Service-Role-Client, damit die RPC auch pre-auth (Login) aufrufbar
 * ist, ohne der anon-Rolle Access auf die Tabelle zu geben.
 */
export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction,
): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[action];
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_and_increment_rate_limit", {
    p_identifier: identifier,
    p_action: action,
    p_max_attempts: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail-open ist Absicht: Ein DB-Aussetzer soll nicht alle Logins
    // blockieren. Der Preis ist, dass ein dauerhaft kaputtes Rate-Limit
    // unsichtbar bleibt — deshalb ueber den Logger statt console.error.
    // So landet es mit request_id in PostHog und faellt auf.
    getLogger().error(
      { err: { message: error.message, code: error.code }, action, fail_open: true },
      "rate limit check failed — request allowed",
    );
    return true;
  }
  return data === true;
}

/**
 * Ermittelt die Client-IP für das Rate-Limit.
 *
 * Vertrauensgrenze: `x-forwarded-for` ist ein Client-Header und frei setzbar.
 * Ein Angreifer schickt `X-Forwarded-For: 1.2.3.4`, der Proxy hängt die echte
 * IP an — der linkeste Eintrag ist also der gefälschte. Wer den nimmt, gibt
 * dem Angreifer pro Request einen frischen Rate-Limit-Bucket und hebelt den
 * Brute-Force-Schutz vollständig aus.
 *
 * Deshalb in dieser Reihenfolge:
 * 1. `x-real-ip` — wird von der Vercel-Edge gesetzt und vom Client nicht
 *    durchgereicht. Auf Vercel die verlässliche Quelle.
 * 2. Der **rechteste** `x-forwarded-for`-Eintrag — der Wert, den der äußerste
 *    vertrauenswürdige Proxy angehängt hat. Gefälschte Werte stehen links davon.
 *
 * Bei einem anderen Hosting mit mehreren Proxy-Schichten muss diese Annahme neu
 * bewertet werden: Dann ist der richtige Eintrag der n-te von rechts, wobei n
 * die Zahl der eigenen Proxies ist.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
