/**
 * Sendet eine Slack-Nachricht über einen eigenen Bot (chat:write) — für
 * .claude/rules/autonomous.md's Blocker- und Phasenübergangs-Benachrichtigungen.
 *
 * Aufruf:  npx tsx scripts/slack-notify.ts "<Nachricht>"
 * Env:     SLACK_BOT_TOKEN, SLACK_NOTIFY_CHANNEL_ID
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env.local optional
  }
}

interface SlackPostMessageResponse {
  ok: boolean
  error?: string
}

async function main(): Promise<void> {
  loadEnvLocal()

  const message = process.argv[2]
  if (!message) {
    console.error('❌ Nachricht fehlt. Aufruf: npx tsx scripts/slack-notify.ts "<Nachricht>"')
    process.exit(1)
  }

  const token = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_NOTIFY_CHANNEL_ID
  if (!token || !channel) {
    console.error('❌ SLACK_BOT_TOKEN oder SLACK_NOTIFY_CHANNEL_ID fehlt in .env.local')
    process.exit(1)
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text: message }),
  })

  const data = (await res.json()) as SlackPostMessageResponse
  if (!data.ok) {
    console.error(`❌ Slack-Versand fehlgeschlagen: ${data.error}`)
    process.exit(1)
  }

  console.log('✅ Slack-Nachricht gesendet.')
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`❌ ${msg}`)
  process.exit(1)
})
