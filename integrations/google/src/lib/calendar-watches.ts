import type { OAuth2Client } from 'google-auth-library'
import { reconcileCalendarWatches, type WatchReconcileSummary } from './calendar_link'
import { listCrmCalendarRecords } from './crm-calendars'

/**
 * Open push channels for sync-enabled calendars that have none and stop
 * channels on calendars whose sync is off. Renewal is not done here: each
 * channel's registration is a lease the platform renews (calendar_push.renew).
 */
export async function ensureCalendarWatches(
  auth: OAuth2Client,
): Promise<WatchReconcileSummary | null> {
  const records = await listCrmCalendarRecords().catch(() => null)
  if (!records || records.length === 0) return null
  return reconcileCalendarWatches(auth, records)
}

const ensured = new Set<string>()

/**
 * `ensureCalendarWatches` once per installation per warm process, for hot
 * paths like the calendar window pull. Best-effort: logs and moves on.
 */
export async function ensureCalendarWatchesOnce(
  appInstallationId: string,
  auth: OAuth2Client,
): Promise<void> {
  if (ensured.has(appInstallationId)) return
  try {
    await ensureCalendarWatches(auth)
    ensured.add(appInstallationId)
  } catch (error) {
    console.warn('[Google] Could not reconcile calendar push channels:', error)
  }
}

/** Test hook. */
export function resetEnsuredCalendarWatches(): void {
  ensured.clear()
}
