import type { VercelConfig } from "@vercel/config/v1";

/**
 * Vercel-Konfiguration für das AI Coding Starter Kit.
 *
 * `regions: ["fra1"]` — alle Server-Functions laufen in Frankfurt, co-located
 * mit der Supabase-Region (eu-central-1). Eliminiert den transatlantischen
 * Roundtrip auf jeder Server-Component-Query (typischer Impact: −66 bis −78 %
 * TTFB auf Server-rendered Routes).
 *
 * Falls dein Stack in einer anderen Region läuft, anpassen — z. B. `iad1`
 * (US East) oder `sfo1` (US West). Liste: https://vercel.com/docs/regions
 */
export const config: VercelConfig = {
  framework: "nextjs",
  regions: ["fra1"],
};
