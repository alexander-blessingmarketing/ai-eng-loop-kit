'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'

/**
 * Ohne PostHog-Key findet kein Tracking statt: `posthog.init()` in
 * `src/instrumentation-client.ts` laeuft dann gar nicht erst.
 *
 * Der Banner darf sich in dem Fall nicht zeigen. Ein Einwilligungs-Banner ohne
 * Anlass ist nicht bloss ueberfluessig — er behauptet eine Verarbeitung, die es
 * nicht gibt, und holt eine Einwilligung fuer einen Dienst ein, der nicht laeuft.
 */
const TRACKING_AKTIV = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!TRACKING_AKTIV) return
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage check after mount
      setVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    posthog.opt_in_capturing()
    setVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    posthog.opt_out_capturing()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Wir verwenden Cookies zur Analyse und Verbesserung dieses Tools.
          Ihre Daten werden in der EU (Frankfurt) verarbeitet.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Ablehnen
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Akzeptieren
          </Button>
        </div>
      </div>
    </div>
  )
}
