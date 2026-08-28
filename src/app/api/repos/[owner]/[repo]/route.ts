import { NextResponse } from "next/server";
import { fetchRepoDetail, GithubApiError } from "@/lib/github/client";
import type { RepoDetailResult } from "@/lib/github/types";
import { getLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const STATUS_BY_ERROR_TYPE = {
  token: 401,
  unavailable: 503,
  not_found: 404,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  try {
    const data = await fetchRepoDetail(owner, repo);
    const result: RepoDetailResult = { ok: true, data };
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GithubApiError) {
      if (e.type !== "not_found") {
        getLogger().error({ err: { type: e.type, message: e.message }, owner, repo }, "github api error");
      }
      const result: RepoDetailResult = { ok: false, error: { type: e.type, message: e.message } };
      return NextResponse.json(result, { status: STATUS_BY_ERROR_TYPE[e.type] });
    }

    getLogger().error(
      { err: e instanceof Error ? { name: e.name, message: e.message } : { message: String(e) }, owner, repo },
      "unexpected error loading repo detail"
    );
    const result: RepoDetailResult = {
      ok: false,
      error: { type: "unavailable", message: "Unerwarteter Fehler beim Laden der Repo-Details" },
    };
    return NextResponse.json(result, { status: 503 });
  }
}
