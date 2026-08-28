import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllRepos, fetchOpenPRCount, fetchRepoDetail, GithubApiError } from "./client";

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

  describe("fetchRepoDetail", () => {
    function makeCommitRaw(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        sha: "abc123",
        commit: {
          message: "Fix bug\n\nLonger description here",
          author: { name: "Ada Lovelace", date: "2026-01-01T00:00:00Z" },
        },
        ...overrides,
      };
    }

    function makePullRaw(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: 1,
        number: 42,
        title: "Add feature",
        user: { login: "octocat" },
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
      };
    }

    it("wirft 'not_found', wenn das Repo nicht existiert/sichtbar ist (AC-5)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
      await expect(fetchRepoDetail("owner", "missing")).rejects.toMatchObject({ type: "not_found" });
    });

    it("lädt Commits, offene und geschlossene PRs und kürzt die Commit-Message auf die erste Zeile (EC-2)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({})) // existence check
        .mockResolvedValueOnce(jsonResponse([makeCommitRaw()])) // commits
        .mockResolvedValueOnce(jsonResponse([makePullRaw({ id: 1 })])) // open
        .mockResolvedValueOnce(jsonResponse([makePullRaw({ id: 2 })])); // closed
      vi.stubGlobal("fetch", fetchMock);

      const data = await fetchRepoDetail("owner", "repo");

      expect(data.commits).toEqual([
        { sha: "abc123", titleLine: "Fix bug", authorName: "Ada Lovelace", date: "2026-01-01T00:00:00Z" },
      ]);
      expect(data.openPRs).toHaveLength(1);
      expect(data.closedPRs).toHaveLength(1);
    });

    it("behandelt 409 auf /commits als leeres Repo statt als Fehler (AC-9)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({})) // existence check
        .mockResolvedValueOnce(new Response(null, { status: 409 })) // commits: empty repo
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      const data = await fetchRepoDetail("owner", "empty-repo");

      expect(data.commits).toEqual([]);
    });

    it("setzt authorName/authorLogin auf null, wenn GitHub keinen verknüpften Account liefert (EC-1)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse([makeCommitRaw({ commit: { message: "x", author: null } })]))
        .mockResolvedValueOnce(jsonResponse([makePullRaw({ user: null })]))
        .mockResolvedValueOnce(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      const data = await fetchRepoDetail("owner", "repo");

      expect(data.commits[0].authorName).toBeNull();
      expect(data.openPRs[0].authorLogin).toBeNull();
    });
  });
});
