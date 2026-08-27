import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">AI Engineering Kit</h1>
        <p className="max-w-xl text-muted-foreground">
          Next.js + Supabase + Vercel. Loslegen mit{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">/init &lt;idee&gt;</code>{" "}
          in Claude Code.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Anmelden</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/api/health">Health</Link>
        </Button>
      </div>
    </main>
  );
}
