import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchRepoDetail = vi.fn();

vi.mock("@/lib/github/client", () => ({
  fetchRepoDetail: (...args: unknown[]) => fetchRepoDetail(...args),
  GithubApiError: class GithubApiError extends Error {
    type: "token" | "unavailable" | "not_found";
    constructor(type: "token" | "unavailable" | "not_found", message: string) {
      super(message);
      this.type = type;
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ error: vi.fn() }),
}));

function makeParams(owner: string, repo: string) {
  return { params: Promise.resolve({ owner, repo }) };
}

describe("GET /api/repos/[owner]/[repo]", () => {
  beforeEach(() => {
    fetchRepoDetail.mockReset();
  });

  it("gibt Commits + PRs zurück (AC-1, AC-2, AC-3)", async () => {
    fetchRepoDetail.mockResolvedValue({
      commits: [{ sha: "a", titleLine: "x", authorName: "A", date: "2026-01-01T00:00:00Z" }],
      openPRs: [],
      closedPRs: [],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/repos/o/r"), makeParams("o", "r"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.commits).toHaveLength(1);
    expect(fetchRepoDetail).toHaveBeenCalledWith("o", "r");
  });

  it("mappt 'not_found' auf HTTP 404 (AC-5)", async () => {
    const { GithubApiError } = await import("@/lib/github/client");
    fetchRepoDetail.mockRejectedValue(new GithubApiError("not_found", "nicht gefunden"));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/repos/o/missing"), makeParams("o", "missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.type).toBe("not_found");
  });

  it("mappt 'unavailable' auf HTTP 503 (AC-6)", async () => {
    const { GithubApiError } = await import("@/lib/github/client");
    fetchRepoDetail.mockRejectedValue(new GithubApiError("unavailable", "Rate-Limit"));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/repos/o/r"), makeParams("o", "r"));

    expect(response.status).toBe(503);
  });
});
