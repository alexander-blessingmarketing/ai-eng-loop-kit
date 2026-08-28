import { EmptyState } from "@/components/empty-state";
import { formatRelativeTime } from "@/lib/format";
import type { Commit } from "@/lib/github/types";

interface CommitSectionProps {
  commits: Commit[];
}

export function CommitSection({ commits }: CommitSectionProps) {
  if (commits.length === 0) {
    return <EmptyState message="Noch keine Commits in diesem Repo." />;
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {commits.map((commit) => (
        <li key={commit.sha} className="flex items-center justify-between gap-3 p-3">
          <span className="truncate font-mono text-sm">{commit.titleLine}</span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
            {commit.authorName ?? "Unbekannt"} · {formatRelativeTime(commit.date)}
          </span>
        </li>
      ))}
    </ul>
  );
}
