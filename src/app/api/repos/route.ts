import { NextResponse } from "next/server";
import { fetchAllRepos, fetchOpenPRCount, GithubApiError } from "@/lib/github/client";
import type { Repo, RepoListResult } from "@/lib/github/types";
import { getLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const STATUS_BY_ERROR_TYPE = {
  token: 401,
  unavailable: 503,
} as const;

export async function GET() {
  try {
    const raw = await fetchAllRepos();
    const active = raw.filter((repo) => !repo.archived && !repo.fork);

    const repos: Repo[] = await Promise.all(
      active.map(async (repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        visibility: repo.private ? "private" : "public",
        language: repo.language,
        openPRCount: await fetchOpenPRCount(repo.full_name),
        updatedAt: repo.updated_at,
      }))
    );

    repos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const result: RepoListResult = { ok: true, repos };
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GithubApiError) {
      getLogger().error({ err: { type: e.type, message: e.message } }, "github api error");
      const result: RepoListResult = { ok: false, error: { type: e.type, message: e.message } };
      return NextResponse.json(result, { status: STATUS_BY_ERROR_TYPE[e.type] });
    }

    getLogger().error(
      { err: e instanceof Error ? { name: e.name, message: e.message } : { message: String(e) } },
      "unexpected error loading repos"
    );
    const result: RepoListResult = {
      ok: false,
      error: { type: "unavailable", message: "Unerwarteter Fehler beim Laden der Repos" },
    };
    return NextResponse.json(result, { status: 503 });
  }
}
