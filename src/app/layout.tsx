import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogPageView } from "@/components/posthog-pageview";
import { CookieConsent } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "AI Engineering Kit",
  description: "Next.js + Supabase + Vercel — Basis mit Observability und Monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <PostHogProvider>
          {/* useSearchParams braucht eine Suspense-Grenze, sonst wird die
              gesamte Seite client-seitig gerendert. */}
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
          <CookieConsent />
        </PostHogProvider>
        <Toaster />
      </body>
    </html>
  );
}
