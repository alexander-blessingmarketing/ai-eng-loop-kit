import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatRelativeTime } from "@/lib/format";
import type { PullRequestSummary } from "@/lib/github/types";

function PullRequestList({ pullRequests }: { pullRequests: PullRequestSummary[] }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {pullRequests.map((pr) => (
        <li key={pr.id} className="flex items-center justify-between gap-3 p-3">
          <span className="truncate font-mono text-sm">
            #{pr.number} {pr.title}
          </span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
            {pr.authorLogin ?? "Unbekannt"} · {formatRelativeTime(pr.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface PullRequestSectionProps {
  openPRs: PullRequestSummary[];
  closedPRs: PullRequestSummary[];
}

export function PullRequestSection({ openPRs, closedPRs }: PullRequestSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold">Offen</h2>
          <Badge variant="outline">{openPRs.length}</Badge>
        </div>
        {openPRs.length === 0 ? (
          <EmptyState message="Keine offenen Pull Requests." />
        ) : (
          <PullRequestList pullRequests={openPRs} />
        )}
      </div>

      {closedPRs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Zuletzt geschlossen</h2>
          <PullRequestList pullRequests={closedPRs} />
        </div>
      )}
    </div>
  );
}
