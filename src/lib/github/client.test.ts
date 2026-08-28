import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllRepos, fetchOpenPRCount, GithubApiError } from "./client";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function makeRawRepo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    name: "repo",
    full_name: "owner/repo",
    private: false,
    language: "TypeScript",
    updated_at: "2026-01-01T00:00:00Z",
    archived: false,
    fork: false,
    ...overrides,
  };
}

describe("github client", () => {
  const originalToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env.GITHUB_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("wirft einen 'token'-Fehler, wenn kein Token konfiguriert ist", async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(fetchAllRepos()).rejects.toMatchObject({ type: "token" } satisfies Partial<GithubApiError>);
  });

  it("lädt alle Repos über mehrere Seiten hinweg (EC-1)", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeRawRepo({ id: i, full_name: `owner/repo-${i}` }));
    const page2 = [makeRawRepo({ id: 101, full_name: "owner/repo-101" })];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));
    vi.stubGlobal("fetch", fetchMock);

    const repos = await fetchAllRepos();

    expect(repos).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("wirft 'token', wenn GitHub mit 401 antwortet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(fetchAllRepos()).rejects.toMatchObject({ type: "token" });
  });

  it("wirft 'unavailable' bei Rate-Limit (403 + x-ratelimit-remaining: 0)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 403, headers: { "x-ratelimit-remaining": "0" } })
      )
    );
    await expect(fetchAllRepos()).rejects.toMatchObject({ type: "unavailable" });
  });

  it("wirft 'unavailable' bei einem Netzwerkfehler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchAllRepos()).rejects.toMatchObject({ type: "unavailable" });
  });

  it("liefert die Anzahl offener PRs eines Repos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }, { id: 2 }, { id: 3 }]))
    );
    const count = await fetchOpenPRCount("owner/repo");
    expect(count).toBe(3);
  });
});
