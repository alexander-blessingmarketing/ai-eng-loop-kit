import posthog from 'posthog-js'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * Query-Parameter, die niemals in Analytics landen duerfen. Die Projekt-Regeln
 * verbieten PII in URLs ohnehin (.claude/rules/security.md) — das hier ist das
 * Netz darunter, falls es doch einmal passiert.
 */
const SENSIBLE_PARAMS = [
  'token', 'access_token', 'refresh_token', 'code', 'secret',
  'password', 'pwd', 'email', 'api_key', 'apikey', 'key', 'session',
]

function urlBereinigen(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    const url = new URL(raw, window.location.origin)
    let veraendert = false
    for (const p of SENSIBLE_PARAMS) {
      if (url.searchParams.has(p)) {
        url.searchParams.set(p, '[redacted]')
        veraendert = true
      }
    }
    return veraendert ? url.toString() : raw
  } catch {
    return raw
  }
}

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    opt_out_capturing_by_default: true,
    // Alle Eingaben maskiert. Das ist die sichere Voreinstellung fuer eine
    // Basis: Was ein Nutzer tippt, ist im Zweifel personenbezogen — Namen,
    // Adressen, Freitext. Ein Replay, das das mitschneidet, ist die teuerste
    // Kategorie von Daten, die man versehentlich sammeln kann.
    //
    // Zum Lockern einzelne unkritische Felder freigeben, nicht global oeffnen:
    //   <input data-ph-no-capture={false} />  bzw. per maskInputFn gezielt.
    // Vorher per /dsgvo bewerten lassen.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    // Letzte Station vor dem Versand. Fehlerberichte tragen mit, was zum
    // Zeitpunkt des Absturzes im Kontext lag — inklusive URL. Sentry hat dafuer
    // `beforeSend` (siehe docs/production/error-tracking.md); fuer PostHog gab
    // es hier bislang kein Gegenstueck.
    before_send: (event) => {
      if (!event) return null
      const p = event.properties
      if (p) {
        for (const feld of ['$current_url', '$referrer', '$pathname']) {
          if (p[feld]) p[feld] = urlBereinigen(p[feld])
        }
      }
      return event
    },
    loaded: (ph) => {
      ph.register({
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
      })

      if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'
      ) {
        ph.opt_out_capturing()
        return
      }

      const consent = localStorage.getItem('cookie-consent')
      if (consent === 'accepted') {
        ph.opt_in_capturing()
      }
    },
  })
}
