'use client'

import { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'
import type { Profile } from '@/lib/types'

export function usePostHogIdentity({ profile }: { profile: Profile }) {
  const posthog = usePostHog()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!posthog || identifiedRef.current === profile.id) return

    posthog.identify(profile.id, {
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
    })

    identifiedRef.current = profile.id
  }, [posthog, profile])
}
