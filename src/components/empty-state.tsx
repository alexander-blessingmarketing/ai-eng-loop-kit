interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-border p-8">
      <p className="font-mono text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
