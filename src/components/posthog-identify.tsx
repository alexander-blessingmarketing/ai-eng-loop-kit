'use client'

import { usePostHogIdentity } from '@/hooks/use-posthog-identity'
import type { Profile } from '@/lib/types'

export function PostHogIdentify({ profile }: { profile: Profile }) {
  usePostHogIdentity({ profile })
  return null
}
