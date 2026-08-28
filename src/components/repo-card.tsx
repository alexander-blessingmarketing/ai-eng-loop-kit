import Link from "next/link";
import { GitPullRequest } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { Repo } from "@/lib/github/types";

interface RepoCardProps {
  repo: Repo;
}

export function RepoCard({ repo }: RepoCardProps) {
  return (
    <Link href={`/repos/${repo.fullName}`} className="block">
      <Card className="transition-shadow hover:shadow-[0_0_0_1px_hsl(var(--primary)),0_0_16px_0_hsl(var(--primary)/0.35)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <span className="font-heading truncate text-base font-semibold">{repo.name}</span>
          <Badge variant={repo.visibility === "private" ? "secondary" : "outline"}>
            {repo.visibility === "private" ? "privat" : "öffentlich"}
          </Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="font-mono">{repo.language ?? "—"}</span>
          <span className="flex items-center gap-1 font-mono">
            <GitPullRequest className="h-3.5 w-3.5" aria-hidden />
            {repo.openPRCount}
          </span>
          <span className="font-mono">{formatRelativeTime(repo.updatedAt)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
