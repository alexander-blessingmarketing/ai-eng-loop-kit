import type { RepoListErrorType, Commit, PullRequestSummary, RepoDetailData } from "./types";

const GITHUB_API_BASE = "https://api.github.com";
const PER_PAGE = 100;

export class GithubApiError extends Error {
  type: RepoListErrorType;

  constructor(type: RepoListErrorType, message: string) {
    super(message);
    this.type = type;
  }
}

interface GithubRepoRaw {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  language: string | null;
  updated_at: string;
  archived: boolean;
  fork: boolean;
}

interface GithubPullRaw {
  id: number;
  number: number;
  title: string;
  user: { login: string } | null;
  updated_at: string;
}

interface GithubCommitRaw {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GithubApiError("token", "Kein GitHub-Token konfiguriert (GITHUB_TOKEN fehlt in .env.local)");
  }
  return token;
}

async function rawFetch(path: string, token: string): Promise<Response> {
  try {
    return await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    throw new GithubApiError("unavailable", "Die GitHub-API ist gerade nicht erreichbar (Netzwerkfehler)");
  }
}

function throwForErrorStatus(response: Response): void {
  if (response.status === 401) {
    throw new GithubApiError("token", "Der konfigurierte GitHub-Token ist ungültig");
  }

  if (response.status === 404) {
    throw new GithubApiError("not_found", "Repo nicht gefunden oder für diesen Token nicht sichtbar");
  }

  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    throw new GithubApiError("unavailable", "GitHub-Rate-Limit erreicht — bitte später erneut versuchen");
  }

  if (!response.ok) {
    throw new GithubApiError("unavailable", `GitHub-API antwortet mit Status ${response.status}`);
  }
}

async function githubFetch(path: string, token: string): Promise<Response> {
  const response = await rawFetch(path, token);
  throwForErrorStatus(response);
  return response;
}

/** Lädt alle Repos des Nutzers, paginiert über alle Seiten hinweg (EC-1). */
export async function fetchAllRepos(): Promise<GithubRepoRaw[]> {
  const token = getToken();
  const repos: GithubRepoRaw[] = [];
  let page = 1;

  while (true) {
    const response = await githubFetch(
      `/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`,
      token
    );
    const batch = (await response.json()) as GithubRepoRaw[];
    repos.push(...batch);

    if (batch.length < PER_PAGE) {
      break;
    }
    page += 1;
  }

  return repos;
}

/** Lädt die Anzahl offener PRs für ein einzelnes Repo. */
export async function fetchOpenPRCount(fullName: string): Promise<number> {
  const token = getToken();
  const response = await githubFetch(
    `/repos/${fullName}/pulls?state=open&per_page=100`,
    token
  );
  const pulls = (await response.json()) as GithubPullRaw[];
  return pulls.length;
}

function mapPull(raw: GithubPullRaw, state: "open" | "closed"): PullRequestSummary {
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    authorLogin: raw.user?.login ?? null,
    updatedAt: raw.updated_at,
    state,
  };
}

async function fetchPulls(fullName: string, token: string, state: "open" | "closed", perPage: number): Promise<PullRequestSummary[]> {
  const response = await githubFetch(
    `/repos/${fullName}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`,
    token
  );
  const raw = (await response.json()) as GithubPullRaw[];
  return raw.map((p) => mapPull(p, state));
}

/** Lädt die letzten 20 Commits des Default-Branch. Ein Repo ohne Commits liefert 409 statt einer leeren Liste (AC-9). */
async function fetchCommits(fullName: string, token: string): Promise<Commit[]> {
  const response = await rawFetch(`/repos/${fullName}/commits?per_page=20`, token);
  if (response.status === 409) {
    return [];
  }
  throwForErrorStatus(response);

  const raw = (await response.json()) as GithubCommitRaw[];
  return raw.map((c) => ({
    sha: c.sha,
    titleLine: c.commit.message.split("\n")[0],
    authorName: c.commit.author?.name ?? null,
    date: c.commit.author?.date ?? new Date(0).toISOString(),
  }));
}

/** Lädt Commits + offene/geschlossene PRs für ein einzelnes Repo (AC-1, AC-2, AC-3). */
export async function fetchRepoDetail(owner: string, repo: string): Promise<RepoDetailData> {
  const token = getToken();
  const fullName = `${owner}/${repo}`;

  // Existenz/Sichtbarkeit zuerst prüfen — ein 404 hier spart die drei Folge-Requests
  // und deckt zugleich EC-4 ab (ungültig formatiertes owner/repo landet ebenfalls auf 404).
  await githubFetch(`/repos/${fullName}`, token);

  const [commits, openPRs, closedPRs] = await Promise.all([
    fetchCommits(fullName, token),
    fetchPulls(fullName, token, "open", 100),
    fetchPulls(fullName, token, "closed", 10),
  ]);

  return { commits, openPRs, closedPRs };
}

export type { GithubRepoRaw };
