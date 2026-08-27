"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; rateLimited?: boolean };

export async function loginAction(
  email: string,
  password: string,
): Promise<LoginResult> {
  const h = await headers();
  const ip = getClientIp(h);
  const konto = `email:${email.trim().toLowerCase()}`;

  // Zwei Zähler, nicht einer. Nur pro IP zu limitieren laesst zwei Angriffe
  // ungebremst durch:
  //   - verteilter Angriff auf EIN Konto (Angreifer rotiert IPs)
  //   - Credential Stuffing (ein haeufiges Passwort gegen VIELE Konten,
  //     jeder Versuch ist der erste fuer diese Kombination)
  // Beide Aufrufe muessen laufen, damit auch beide Zaehler hochgehen —
  // deshalb kein `&&`, das den zweiten ueberspringen wuerde.
  const [ipOk, kontoOk] = await Promise.all([
    checkRateLimit(ip, "login"),
    checkRateLimit(konto, "login"),
  ]);

  if (!ipOk || !kontoOk) {
    return {
      ok: false,
      rateLimited: true,
      error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." };
  }

  return { ok: true };
}
