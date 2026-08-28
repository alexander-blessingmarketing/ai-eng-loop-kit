"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CommitSection } from "@/components/commit-section";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PullRequestSection } from "@/components/pull-request-section";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepoDetailData, RepoListError, RepoDetailResult } from "@/lib/github/types";

type ViewState =
  | { status: "loading" }
  | { status: "error"; error: RepoListError }
  | { status: "loaded"; data: RepoDetailData };

const ERROR_TITLES: Record<RepoListError["type"], string> = {
  token: "GitHub-Token fehlt oder ist ungültig",
  unavailable: "GitHub ist gerade nicht erreichbar",
  not_found: "Repo nicht gefunden",
};

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function RepoDetailPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;

  const [state, setState] = useState<ViewState>({ status: "loading" });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/repos/${owner}/${repo}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<RepoDetailResult>)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          setState({ status: "error", error: result.error });
          return;
        }
        setState({ status: "loaded", data: result.data });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: { type: "unavailable", message: err instanceof Error ? err.message : "Unbekannter Fehler" },
        });
      });
  }, [owner, repo]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const handleRetry = useCallback(() => {
    setState({ status: "loading" });
    load();
  }, [load]);

  const backLink = (
    <Link href="/" className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Zurück
    </Link>
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 sm:p-8">
      <PageHeader title={`${owner}/${repo}`} action={backLink} />

      {state.status === "loading" && <DetailSkeleton />}

      {state.status === "error" && (
        <ErrorState
          title={ERROR_TITLES[state.error.type]}
          message={state.error.message}
          onRetry={state.error.type === "not_found" ? undefined : handleRetry}
        />
      )}

      {state.status === "loaded" && (
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold">Commits</h2>
            <CommitSection commits={state.data.commits} />
          </div>
          <PullRequestSection openPRs={state.data.openPRs} closedPRs={state.data.closedPRs} />
        </div>
      )}
    </main>
  );
}
