import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchAllRepos = vi.fn();
const fetchOpenPRCount = vi.fn();

vi.mock("@/lib/github/client", () => ({
  fetchAllRepos: (...args: unknown[]) => fetchAllRepos(...args),
  fetchOpenPRCount: (...args: unknown[]) => fetchOpenPRCount(...args),
  GithubApiError: class GithubApiError extends Error {
    type: "token" | "unavailable";
    constructor(type: "token" | "unavailable", message: string) {
      super(message);
      this.type = type;
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ error: vi.fn() }),
}));

describe("GET /api/repos", () => {
  beforeEach(() => {
    fetchAllRepos.mockReset();
    fetchOpenPRCount.mockReset();
  });

  it("gibt gefilterte, sortierte Repos zurück (AC-1, EC-2)", async () => {
    fetchAllRepos.mockResolvedValue([
      { id: 1, name: "old", full_name: "o/old", private: false, language: null, updated_at: "2026-01-01T00:00:00Z", archived: false, fork: false },
      { id: 2, name: "new", full_name: "o/new", private: true, language: "TypeScript", updated_at: "2026-02-01T00:00:00Z", archived: false, fork: false },
      { id: 3, name: "archived", full_name: "o/archived", private: false, language: "Go", updated_at: "2026-03-01T00:00:00Z", archived: true, fork: false },
      { id: 4, name: "forked", full_name: "o/forked", private: false, language: "Go", updated_at: "2026-03-01T00:00:00Z", archived: false, fork: true },
    ]);
    fetchOpenPRCount.mockResolvedValue(2);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.repos).toHaveLength(2);
    expect(body.repos.map((r: { name: string }) => r.name)).toEqual(["new", "old"]);
    expect(body.repos[0].language).toBe("TypeScript");
    expect(body.repos.find((r: { name: string }) => r.name === "old").language).toBeNull();
  });

  it("mappt einen Token-Fehler auf HTTP 401 (AC-5)", async () => {
    const { GithubApiError } = await import("@/lib/github/client");
    fetchAllRepos.mockRejectedValue(new GithubApiError("token", "kein Token"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.type).toBe("token");
  });

  it("mappt einen Unavailable-Fehler auf HTTP 503 (AC-6)", async () => {
    const { GithubApiError } = await import("@/lib/github/client");
    fetchAllRepos.mockRejectedValue(new GithubApiError("unavailable", "Rate-Limit"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.error.type).toBe("unavailable");
  });

  it("behandelt eine leere Repo-Liste nicht als Fehler (EC-4)", async () => {
    fetchAllRepos.mockResolvedValue([]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.repos).toEqual([]);
  });
});
