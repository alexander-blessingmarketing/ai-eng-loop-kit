'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

/**
 * Provider-Wrapper für `posthog-js/react`. Die eigentliche Init passiert in
 * `src/instrumentation-client.ts` (Next.js-Standard). Hier wird der schon
 * initialisierte Singleton an React angeflanscht.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
