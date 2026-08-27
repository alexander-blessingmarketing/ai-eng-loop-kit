/**
 * Legt einen HTTP-Monitor in Uptime Kuma für `/api/health` an — via Socket.io.
 *
 * Aufruf:  npm run kuma:register
 * Env:     KUMA_BASE_URL, KUMA_USERNAME, KUMA_PASSWORD, NEXT_PUBLIC_APP_URL
 *
 * Optional: KUMA_MONITOR_NAME (default: "<projekt> — Health"),
 *           KUMA_MONITOR_INTERVAL (default: 60s)
 */

import {
  loadKumaConfig,
  connectAndLogin,
  emitWithAck,
  findMonitorByName,
  findNotificationIds,
  addMonitorToStatusPage,
} from './lib/kuma-client'

interface AddMonitorResponse {
  ok: boolean
  msg: string
  monitorID?: number
}

async function main(): Promise<void> {
  const config = loadKumaConfig()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const projectName = process.env.npm_package_name ?? 'app'
  const monitorName = process.env.KUMA_MONITOR_NAME ?? `${projectName} — Health`
  const interval = Number(process.env.KUMA_MONITOR_INTERVAL ?? 60)
  const healthUrl = `${appUrl}/api/health`
  // Komma-separierte Notification-Channel-Namen, wie in Kuma angelegt
  const notificationNames = (process.env.KUMA_NOTIFICATION_NAMES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // Status-Page-Verknüpfung — Default-Gruppe = Projekt-Name
  const statusPageSlug = process.env.KUMA_STATUS_PAGE_SLUG?.trim() ?? ''
  const statusPageGroup = process.env.KUMA_STATUS_PAGE_GROUP?.trim() ?? projectName

  console.log(`→ Verbinde zu ${config.baseUrl}…`)
  const { socket, monitorList, notifications } = await connectAndLogin(config)

  try {
    let monitorId: number
    const existing = findMonitorByName(monitorList, monitorName)

    if (existing) {
      console.log(`ℹ️  Monitor "${monitorName}" existiert bereits (ID ${existing.id}).`)
      monitorId = existing.id
    } else {
      const notificationIds = findNotificationIds(notifications, notificationNames)
      if (notificationNames.length > 0) {
        const missing = notificationNames.filter(
          (name) => !notifications.some((n) => n.name === name),
        )
        if (missing.length) {
          console.warn(`⚠️  Notification-Channels nicht gefunden: ${missing.join(', ')}`)
          console.warn(`   Verfügbar: ${notifications.map((n) => n.name).join(', ') || '(keine)'}`)
        }
        if (notificationIds.length) {
          console.log(`→ Verknüpfe Notifications: ${notificationIds.length} Channel(s)`)
        }
      }
      const notificationIDList: Record<string, boolean> = {}
      for (const id of notificationIds) notificationIDList[String(id)] = true

      console.log(`→ Lege Monitor "${monitorName}" an: ${healthUrl}`)
      const result = await emitWithAck<AddMonitorResponse>(socket, 'add', {
        type: 'http',
        name: monitorName,
        url: healthUrl,
        interval,
        retryInterval: interval,
        maxretries: 2,
        method: 'GET',
        accepted_statuscodes: ['200-299'],
        timeout: 10,
        notificationIDList,
      })

      if (!result.ok || !result.monitorID) {
        throw new Error(`add fehlgeschlagen: ${result.msg}`)
      }

      console.log(`✅ Monitor angelegt (ID ${result.monitorID})`)
      monitorId = result.monitorID
    }

    console.log(`   ${config.baseUrl}/dashboard/${monitorId}`)

    if (statusPageSlug) {
      console.log(
        `→ Verknüpfe mit Status-Page "${statusPageSlug}", Gruppe "${statusPageGroup}"…`,
      )
      const link = await addMonitorToStatusPage(
        socket,
        config.baseUrl,
        statusPageSlug,
        statusPageGroup,
        monitorId,
      )
      if (link.alreadyPresent) {
        console.log(`ℹ️  Monitor ist bereits in Gruppe — nichts zu tun.`)
      } else if (link.created) {
        console.log(`✅ Gruppe "${statusPageGroup}" angelegt + Monitor verknüpft.`)
      } else {
        console.log(`✅ Monitor zur Gruppe "${statusPageGroup}" hinzugefügt.`)
      }
      console.log(`   ${config.baseUrl}/status/${statusPageSlug}`)
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
