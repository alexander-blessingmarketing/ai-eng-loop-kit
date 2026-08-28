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

export type RepoListErrorType = "token" | "unavailable" | "not_found";

export interface RepoListError {
  type: RepoListErrorType;
  message: string;
}

export type RepoListResult =
  | { ok: true; repos: Repo[] }
  | { ok: false; error: RepoListError };

export interface Commit {
  sha: string;
  titleLine: string;
  authorName: string | null;
  date: string;
}

export type PullRequestState = "open" | "closed";

export interface PullRequestSummary {
  id: number;
  number: number;
  title: string;
  authorLogin: string | null;
  updatedAt: string;
  state: PullRequestState;
}

export interface RepoDetailData {
  commits: Commit[];
  openPRs: PullRequestSummary[];
  closedPRs: PullRequestSummary[];
}

export type RepoDetailResult =
  | { ok: true; data: RepoDetailData }
  | { ok: false; error: RepoListError };
