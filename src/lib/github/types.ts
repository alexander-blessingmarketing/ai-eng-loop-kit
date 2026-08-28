export type RepoVisibility = "private" | "public";

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  visibility: RepoVisibility;
  language: string | null;
  openPRCount: number;
  updatedAt: string;
}

export type RepoListErrorType = "token" | "unavailable";

export interface RepoListError {
  type: RepoListErrorType;
  message: string;
}

export type RepoListResult =
  | { ok: true; repos: Repo[] }
  | { ok: false; error: RepoListError };
