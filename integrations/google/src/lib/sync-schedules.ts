import { createHash } from 'node:crypto'
import { cron, type CronSubscribeParams } from 'skedyul'

export const WATCH_RENEW_TOOL = 'calendar_watch_renew'
export const CATCH_UP_SYNC_TOOL = 'calendar_sync'

/**
 * Minute offset per installation, so every install's schedules do not hit
 * Google's per-project quota at the same instant.
 */
export function scheduleOffset(appInstallationId: string | undefined, modulo: number): number {
  if (!appInstallationId) return 0
  const digest = createHash('sha256').update(appInstallationId).digest()
  return digest.readUInt32BE(0) % modulo
}

/**
 * Safety nets behind live push:
 * - every 6 hours renew watch channels (they expire after about a week);
 * - every 15 minutes an incremental sync (sync tokens) catches anything a
 *   lost push notification missed.
 */
export function syncScheduleParams(appInstallationId?: string): CronSubscribeParams[] {
  const renewMinute = scheduleOffset(appInstallationId, 60)
  const syncOffset = scheduleOffset(appInstallationId, 15)
  const syncMinutes = [0, 15, 30, 45].map((minute) => minute + syncOffset).join(',')
  return [
    {
      toolName: WATCH_RENEW_TOOL,
      schedule: `${renewMinute} */6 * * *`,
      timezone: 'UTC',
      cursorKey: WATCH_RENEW_TOOL,
      inputs: {},
      label: 'Renew Google Calendar push channels',
    },
    {
      toolName: CATCH_UP_SYNC_TOOL,
      schedule: `${syncMinutes} * * * *`,
      timezone: 'UTC',
      cursorKey: 'calendar_sync_catch_up',
      inputs: { enable_live_sync: false },
      label: 'Google Calendar catch-up sync',
    },
  ]
}

/**
 * Subscribe both schedules. cron.subscribe is idempotent per
 * (installation, toolName, cursorKey), so calling this again is safe.
 * Requires an installation-scoped token (tools, OAuth callback, setup hooks).
 */
export async function ensureSyncSchedules(appInstallationId?: string): Promise<string[]> {
  const ids: string[] = []
  for (const params of syncScheduleParams(appInstallationId)) {
    const subscription = await cron.subscribe(params)
    ids.push(subscription.id)
  }
  return ids
}

const ensuredInstallations = new Set<string>()

/**
 * Best-effort ensure from hot paths (window pull): at most once per
 * installation per warm process, and never fails the caller.
 */
export async function ensureSyncSchedulesOnce(appInstallationId: string): Promise<void> {
  if (!appInstallationId || ensuredInstallations.has(appInstallationId)) {
    return
  }
  try {
    await ensureSyncSchedules(appInstallationId)
    ensuredInstallations.add(appInstallationId)
  } catch (error) {
    console.warn('[Google] Could not subscribe sync schedules:', error)
  }
}

/** Remove this app's schedules (uninstall). Best-effort per subscription. */
export async function removeSyncSchedules(): Promise<number> {
  const { subscriptions } = await cron.list()
  const ours = subscriptions.filter(
    (subscription) =>
      subscription.toolName === WATCH_RENEW_TOOL || subscription.toolName === CATCH_UP_SYNC_TOOL,
  )
  let removed = 0
  for (const subscription of ours) {
    try {
      const { deleted } = await cron.unsubscribe(subscription.id)
      if (deleted) removed += 1
    } catch (error) {
      console.warn(`[Google] Could not remove schedule ${subscription.id}:`, error)
    }
  }
  return removed
}

/** Test hook: forget memoized installations. */
export function resetEnsuredSyncSchedules(): void {
  ensuredInstallations.clear()
}
