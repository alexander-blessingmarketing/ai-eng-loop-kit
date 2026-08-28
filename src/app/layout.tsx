import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogPageView } from "@/components/posthog-pageview";
import { CookieConsent } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "Repo-Übersicht",
  description: "Lokales Dashboard für den Überblick über die eigenen GitHub-Repos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
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
