/**
 * Test-Helfer: löscht alle Monitore deren Name mit `_starter-kit-test` startet
 * (oder mit `KUMA_CLEANUP_PREFIX`). Wird im CI-Test verwendet, kann aber auch
 * manuell laufen.
 *
 * Aufruf:  npx tsx scripts/kuma-cleanup.ts [prefix]
 */

import {
  loadKumaConfig,
  connectAndLogin,
  emitWithAck,
  removeStatusPageGroupsByPrefix,
} from './lib/kuma-client'

async function main(): Promise<void> {
  const prefix = process.argv[2] ?? process.env.KUMA_CLEANUP_PREFIX ?? '_starter-kit-test'
  const config = loadKumaConfig()

  console.log(`→ Verbinde zu ${config.baseUrl}…`)
  const { socket, monitorList } = await connectAndLogin(config)

  try {
    const matches = Object.values(monitorList).filter((m) => m.name.startsWith(prefix))

    if (matches.length === 0) {
      console.log(`ℹ️  Keine Monitore mit Prefix "${prefix}" gefunden.`)
    } else {
      console.log(`→ Lösche ${matches.length} Monitor(e) mit Prefix "${prefix}":`)
      for (const m of matches) {
        const result = await emitWithAck<{ ok: boolean; msg?: string }>(socket, 'deleteMonitor', m.id)
        if (result.ok) {
          console.log(`   ✅ "${m.name}" (ID ${m.id})`)
        } else {
          console.log(`   ❌ "${m.name}" (ID ${m.id}): ${result.msg}`)
        }
      }
    }

    // Optional: Status-Page-Gruppen mit dem gleichen Prefix entfernen
    const slug = process.env.KUMA_STATUS_PAGE_SLUG?.trim()
    if (slug) {
      const removed = await removeStatusPageGroupsByPrefix(socket, config.baseUrl, slug, prefix)
      if (removed.length) {
        console.log(`→ Status-Page "${slug}" — Gruppen entfernt: ${removed.join(', ')}`)
      }
    }
  } finally {
    socket.disconnect()
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`❌ ${msg}`)
  process.exit(1)
})
