"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { RepoList, RepoListSkeleton } from "@/components/repo-list";
import type { Repo, RepoListError, RepoListResult } from "@/lib/github/types";

type ViewState =
  | { status: "loading" }
  | { status: "error"; error: RepoListError }
  | { status: "empty" }
  | { status: "loaded"; repos: Repo[] };

const ERROR_TITLES: Record<RepoListError["type"], string> = {
  token: "GitHub-Token fehlt oder ist ungültig",
  unavailable: "GitHub ist gerade nicht erreichbar",
};

export default function HomePage() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/repos", { signal: controller.signal })
      .then((res) => res.json() as Promise<RepoListResult>)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          setState({ status: "error", error: result.error });
          return;
        }
        setState(result.repos.length === 0 ? { status: "empty" } : { status: "loaded", repos: result.repos });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: { type: "unavailable", message: err instanceof Error ? err.message : "Unbekannter Fehler" },
        });
      });
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const handleRetry = useCallback(() => {
    setState({ status: "loading" });
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 sm:p-8">
      <PageHeader title="Repos" />

      {state.status === "loading" && <RepoListSkeleton />}

      {state.status === "error" && (
        <ErrorState title={ERROR_TITLES[state.error.type]} message={state.error.message} onRetry={handleRetry} />
      )}

      {state.status === "empty" && <EmptyState message="Keine aktiven Repos gefunden." />}

      {state.status === "loaded" && <RepoList repos={state.repos} />}
    </main>
  );
}
