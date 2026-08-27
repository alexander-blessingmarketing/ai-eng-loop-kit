import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Whitelist für `next/image`-Optimizer auf Supabase-Storage-Bilder.
 * Hostname wird automatisch aus `NEXT_PUBLIC_SUPABASE_URL` abgeleitet, sodass
 * Bilder aus dem Public-Storage-Pfad durch den Vercel-Image-Optimizer laufen
 * (AVIF/WebP, srcset, Edge-Cache). Restriktiv: kein Wildcard-Hostname.
 *
 * Siehe `docs/production/performance.md` für Patterns + Begründung.
 */
function buildImageRemotePatterns(): RemotePattern[] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];
  try {
    const { hostname } = new URL(supabaseUrl);
    return [
      {
        protocol: "https",
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,

  images: {
    remotePatterns: buildImageRemotePatterns(),
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  },

  // PostHog Reverse-Proxy (umgeht Adblocker, EU-Cloud).
  //
  // Nur wenn PostHog ueberhaupt konfiguriert ist. Ohne Key initialisiert der
  // Client nicht, und die drei Routen wuerden ins Leere zeigen: offene Proxys
  // auf eine fremde Domain, die niemand nutzt. Weg damit, statt sie
  // mitzuschleppen.
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return [];
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

// Sourcemap-Upload zu PostHog (optional)
// Aktivieren: `npm i @posthog/nextjs-config`, dann import + `withPostHogConfig(nextConfig, …)` zurückgeben.
// Doku: docs/production/posthog-sourcemaps.md
export default nextConfig;
