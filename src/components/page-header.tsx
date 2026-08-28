import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-wide text-foreground sm:text-3xl">
        {title}
      </h1>
      {action}
    </div>
  );
}
