import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { getLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      // Die Meldung bleibt im Log. Nach aussen geht nur der Statuscode:
      // Der Endpunkt ist unauthentifiziert erreichbar, und Postgres-Fehler
      // nennen gern Schema-, Tabellen- und Rollennamen. Uptime-Monitoring
      // braucht davon nichts.
      getLogger().error(
        { err: { message: error.message, code: error.code }, check: "database" },
        "health check failed",
      );
      return NextResponse.json(
        { status: "error", check: "database" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    getLogger().error(
      { err: e instanceof Error ? { name: e.name, message: e.message } : { message: String(e) } },
      "health check threw",
    );
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
