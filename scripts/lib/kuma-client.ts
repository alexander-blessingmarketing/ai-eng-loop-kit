/**
 * Minimaler Socket.io-Client für Uptime Kuma (kein REST verfügbar).
 * Kuma sendet die Monitor-Liste nach Login asynchron via `monitorList`-Event.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { io, type Socket } from 'socket.io-client'

export interface KumaMonitor {
  id: number
  name: string
  type: string
  url?: string
  active: boolean
}

export type KumaMonitorList = Record<string, KumaMonitor>

export interface KumaNotification {
  id: number
  name: string
  active: boolean
  isDefault: boolean
}

export interface KumaConfig {
  baseUrl: string
  username: string
  password: string
}

export function loadKumaConfig(): KumaConfig {
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

  const rawBaseUrl = process.env.KUMA_BASE_URL
  const username = process.env.KUMA_USERNAME
  const password = process.env.KUMA_PASSWORD

  if (!rawBaseUrl || !username || !password) {
    throw new Error('KUMA_BASE_URL, KUMA_USERNAME oder KUMA_PASSWORD fehlt in .env.local')
  }

  // Origin extrahieren — Kuma exposed Socket.io nur auf `/`. Ein UI-Pfad in der
  // URL (z. B. `/manage-status-page`) würde sonst als Socket.io-Namespace
  // interpretiert → "Invalid namespace".
  let baseUrl: string
  try {
    baseUrl = new URL(rawBaseUrl).origin
  } catch {
    throw new Error(`KUMA_BASE_URL ist keine gueltige URL: ${rawBaseUrl}`)
  }

  return { baseUrl, username, password }
}

interface AckTimeoutError extends Error {
  code: 'KUMA_ACK_TIMEOUT'
}

export function emitWithAck<T>(socket: Socket, event: string, ...args: unknown[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Timeout: ${event}`) as AckTimeoutError
      err.code = 'KUMA_ACK_TIMEOUT'
      reject(err)
    }, 15000)
    socket.emit(event, ...args, (response: T) => {
      clearTimeout(timer)
      resolve(response)
    })
  })
}

export interface KumaSession {
  socket: Socket
  monitorList: KumaMonitorList
  notifications: KumaNotification[]
}

export async function connectAndLogin(config: KumaConfig): Promise<KumaSession> {
  const socket = io(config.baseUrl, { transports: ['websocket'], reconnection: false })

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', (err) => reject(new Error(`Connect-Error: ${err.message}`)))
    setTimeout(() => reject(new Error('Timeout: connect')), 15000)
  })

  // Listener VOR Login registrieren — Kuma pusht `monitorList` + `notificationList`
  // direkt nach Auth. Zwischen ack und Listener könnte das sonst verloren gehen.
  let monitorList: KumaMonitorList = {}
  let notifications: KumaNotification[] = []
  let monitorListReceived = false

  socket.on('monitorList', (list: KumaMonitorList) => {
    monitorList = list ?? {}
    monitorListReceived = true
  })
  socket.on('notificationList', (list: KumaNotification[]) => {
    notifications = list ?? []
  })

  const login = await emitWithAck<{ ok: boolean; msg?: string }>(socket, 'login', {
    username: config.username,
    password: config.password,
    token: '',
  })
  if (!login.ok) {
    socket.disconnect()
    throw new Error(`Login fehlgeschlagen: ${login.msg ?? 'unbekannter Fehler'}`)
  }

  // Warte bis zu 5s auf den `monitorList`-Push (typisch <500 ms). notificationList
  // kommt im selben Sync — zusätzlicher kurzer Buffer für späten Push.
  const start = Date.now()
  while (!monitorListReceived && Date.now() - start < 5000) {
    await new Promise((r) => setTimeout(r, 100))
  }
  await new Promise((r) => setTimeout(r, 200))

  return { socket, monitorList, notifications }
}

export function findNotificationIds(
  notifications: KumaNotification[],
  names: string[],
): number[] {
  const found: number[] = []
  for (const name of names) {
    const match = notifications.find((n) => n.name === name)
    if (match) found.push(match.id)
  }
  return found
}

export interface KumaStatusPageGroup {
  id: number
  name: string
  weight: number
  monitorList: Array<{ id: number; sendUrl?: 0 | 1 }>
}

export interface KumaStatusPagePublic {
  config: { slug: string; title: string; [k: string]: unknown }
  publicGroupList: KumaStatusPageGroup[]
}

/**
 * Fügt einen Monitor zu einer Status-Page-Gruppe hinzu (idempotent).
 * Erstellt die Gruppe falls sie nicht existiert.
 *
 * Kombiniert public REST (`/api/status-page/<slug>` für die Group-Liste)
 * und Socket.io (`getStatusPage` für die volle Config + `saveStatusPage`
 * für den Update).
 */
async function loadStatusPage(
  socket: Socket,
  baseUrl: string,
  slug: string,
): Promise<{ config: Record<string, unknown>; groups: KumaStatusPageGroup[] }> {
  const configResp = await emitWithAck<{ ok: boolean; msg?: string; config?: Record<string, unknown> }>(
    socket,
    'getStatusPage',
    slug,
  )
  if (!configResp.ok || !configResp.config) {
    throw new Error(`Status-Page "${slug}" nicht gefunden: ${configResp.msg ?? 'unbekannt'}`)
  }
  const publicResp = await fetch(`${baseUrl}/api/status-page/${slug}`)
  if (!publicResp.ok) {
    throw new Error(`Public-API ${publicResp.status} fuer Status-Page "${slug}"`)
  }
  const publicData = (await publicResp.json()) as KumaStatusPagePublic
  return { config: configResp.config, groups: publicData.publicGroupList ?? [] }
}

function buildWireGroups(
  groups: KumaStatusPageGroup[],
  newGroupNames: Set<string>,
): Array<Record<string, unknown>> {
  return groups.map((g) => {
    const out: Record<string, unknown> = {
      name: g.name,
      weight: g.weight,
      monitorList: g.monitorList.map((m) => ({ id: m.id, sendUrl: m.sendUrl ?? 0 })),
    }
    if (!newGroupNames.has(g.name)) {
      out.id = g.id
    }
    return out
  })
}

async function saveStatusPage(
  socket: Socket,
  slug: string,
  config: Record<string, unknown>,
  wireGroups: Array<Record<string, unknown>>,
): Promise<void> {
  // imgDataUrl muss leerer String sein — Kuma-Server crashed sonst auf
  // .startsWith(). Icon bleibt durch config.icon erhalten.
  const resp = await emitWithAck<{ ok: boolean; msg?: string }>(
    socket,
    'saveStatusPage',
    slug,
    config,
    '',
    wireGroups,
  )
  if (!resp.ok) {
    throw new Error(`saveStatusPage fehlgeschlagen: ${resp.msg ?? 'unbekannt'}`)
  }
}

export async function addMonitorToStatusPage(
  socket: Socket,
  baseUrl: string,
  slug: string,
  groupName: string,
  monitorId: number,
): Promise<{ created: boolean; alreadyPresent: boolean }> {
  const { config, groups } = await loadStatusPage(socket, baseUrl, slug)

  let group = groups.find((g) => g.name === groupName)
  let created = false
  if (!group) {
    group = { id: 0, name: groupName, weight: groups.length + 1, monitorList: [] }
    groups.push(group)
    created = true
  }

  if (group.monitorList.some((m) => m.id === monitorId)) {
    return { created, alreadyPresent: true }
  }
  group.monitorList.push({ id: monitorId, sendUrl: 0 })

  const newGroups = created ? new Set([groupName]) : new Set<string>()
  await saveStatusPage(socket, slug, config, buildWireGroups(groups, newGroups))
  return { created, alreadyPresent: false }
}

/**
 * Entfernt Gruppen mit gegebenem Prefix aus einer Status-Page (Test-Cleanup).
 */
export async function removeStatusPageGroupsByPrefix(
  socket: Socket,
  baseUrl: string,
  slug: string,
  prefix: string,
): Promise<string[]> {
  const { config, groups } = await loadStatusPage(socket, baseUrl, slug)
  const remaining = groups.filter((g) => !g.name.startsWith(prefix))
  const removed = groups.filter((g) => g.name.startsWith(prefix)).map((g) => g.name)
  if (removed.length === 0) return []
  await saveStatusPage(socket, slug, config, buildWireGroups(remaining, new Set()))
  return removed
}

export function findMonitorByName(list: KumaMonitorList, name: string): KumaMonitor | undefined {
  return Object.values(list).find((m) => m.name === name)
}
