import type { RepoListErrorType } from "./types";

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
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GithubApiError("token", "Kein GitHub-Token konfiguriert (GITHUB_TOKEN fehlt in .env.local)");
  }
  return token;
}

async function githubFetch(path: string, token: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    throw new GithubApiError("unavailable", "Die GitHub-API ist gerade nicht erreichbar (Netzwerkfehler)");
  }

  if (response.status === 401) {
    throw new GithubApiError("token", "Der konfigurierte GitHub-Token ist ungültig");
  }

  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    throw new GithubApiError("unavailable", "GitHub-Rate-Limit erreicht — bitte später erneut versuchen");
  }

  if (!response.ok) {
    throw new GithubApiError("unavailable", `GitHub-API antwortet mit Status ${response.status}`);
  }

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

export type { GithubRepoRaw };
