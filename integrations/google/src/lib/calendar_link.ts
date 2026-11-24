import { randomBytes, timingSafeEqual } from 'node:crypto'
import { AppAuthInvalidError, TokenRefreshRequiredError, webhook } from 'skedyul'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleCalendarRecord } from '../events/types'
import {
  startCalendarWatch,
  stopCalendarWatch,
  watchNeedsRenewal,
} from '../services/calendar/watch'
import { updateCrmCalendarSyncState } from './crm-calendars'
import { isGooglePushNotSupported, isGoogleRateLimited } from './google-errors'

const CALENDAR_PUSH_WEBHOOK_NAME = 'calendar_push'

export async function ensureInstallCalendarPushWebhook(): Promise<string> {
  const listResult = await webhook.list({ name: CALENDAR_PUSH_WEBHOOK_NAME })
  if (listResult.webhooks.length > 0) {
    return listResult.webhooks[0].url
  }

  const created = await webhook.create(CALENDAR_PUSH_WEBHOOK_NAME)
  return created.url
}

/** Random per-channel secret Google echoes back in X-Goog-Channel-Token. */
export function newWatchToken(): string {
  return randomBytes(32).toString('hex')
}

/** Constant-time comparison of the stored and received channel tokens. */
export function watchTokensMatch(
  stored: string | null | undefined,
  received: string | null | undefined,
): boolean {
  if (!stored || !received) return false
  const left = Buffer.from(stored, 'utf8')
  const right = Buffer.from(received, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

function hasChannel(record: GoogleCalendarRecord): boolean {
  return Boolean(record.watch_channel_id && record.watch_resource_id)
}

const CLEARED_WATCH = {
  watch_channel_id: null,
  watch_resource_id: null,
  watch_expiration: null,
  watch_token: null,
} as const

export class CalendarRowMissingError extends Error {
  constructor(calendarId: string) {
    super(
      `Calendar ${calendarId} has no CRM calendar row; import calendars before turning on live sync`,
    )
    this.name = 'CalendarRowMissingError'
  }
}

/**
 * Open a new push channel with a random secret token and store channel id,
 * resource id, expiry and token on the CRM calendar row (the webhook checks
 * pings against them). A channel that cannot be stored is stopped again.
 */
async function startPersistedWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
): Promise<GoogleCalendarRecord> {
  const webhookUrl = await ensureInstallCalendarPushWebhook()
  const watch = await startCalendarWatch(auth, {
    calendarId: record.calendar_id,
    webhookUrl,
    token: newWatchToken(),
  })
  const state = {
    watch_channel_id: watch.channelId,
    watch_resource_id: watch.resourceId,
    watch_expiration: watch.expiration,
    watch_token: watch.token,
  }

  const saved = await updateCrmCalendarSyncState(record, state).catch(async (error) => {
    await stopCalendarWatch(auth, { channelId: watch.channelId, resourceId: watch.resourceId })
    throw error
  })
  if (!saved) {
    await stopCalendarWatch(auth, { channelId: watch.channelId, resourceId: watch.resourceId })
    throw new CalendarRowMissingError(record.calendar_id)
  }
  return { ...record, ...state }
}

/**
 * Keep one live channel for the calendar: reuse a stored channel that is not
 * close to expiry, otherwise open a new one first and then stop the old one
 * (no gap in notifications).
 */
export async function ensureCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  now: number = Date.now(),
): Promise<GoogleCalendarRecord> {
  if (hasChannel(record) && record.watch_token && !watchNeedsRenewal(record.watch_expiration, now)) {
    return record
  }

  const next = await startPersistedWatch(auth, record)
  if (hasChannel(record)) {
    await stopCalendarWatch(auth, {
      channelId: record.watch_channel_id as string,
      resourceId: record.watch_resource_id as string,
    })
  }
  return next
}

/** Stop the calendar's channel and clear the stored watch fields. */
export async function removeCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  options?: { clear?: boolean },
): Promise<void> {
  if (hasChannel(record)) {
    await stopCalendarWatch(auth, {
      channelId: record.watch_channel_id as string,
      resourceId: record.watch_resource_id as string,
    })
  }
  if (options?.clear !== false && (hasChannel(record) || record.watch_token)) {
    await updateCrmCalendarSyncState(record, CLEARED_WATCH)
  }
}

export type WatchReconcileSummary = {
  created: string[]
  renewed: string[]
  stopped: string[]
  unchanged: string[]
  /** Calendars Google does not offer push for (holidays, birthdays). */
  unsupported: string[]
  failed: Array<{ calendar_id: string; error: string }>
}

/**
 * Renew channels expiring within 24h, open channels for sync-enabled
 * calendars that have none, and stop channels on calendars whose sync is off.
 * Auth and rate-limit errors abort the run so the platform can refresh the
 * token or back off; other per-calendar errors are collected.
 */
export async function reconcileCalendarWatches(
  auth: OAuth2Client,
  records: GoogleCalendarRecord[],
  now: number = Date.now(),
): Promise<WatchReconcileSummary> {
  const summary: WatchReconcileSummary = {
    created: [],
    renewed: [],
    stopped: [],
    unchanged: [],
    unsupported: [],
    failed: [],
  }

  for (const record of records) {
    if (!record.calendar_id) continue
    try {
      if (record.sync_enabled !== true) {
        if (hasChannel(record) || record.watch_token) {
          await removeCalendarWatch(auth, record)
          summary.stopped.push(record.calendar_id)
        }
        continue
      }

      const had = hasChannel(record)
      const next = await ensureCalendarWatch(auth, record, now)
      if (next === record) {
        summary.unchanged.push(record.calendar_id)
      } else if (had) {
        summary.renewed.push(record.calendar_id)
      } else {
        summary.created.push(record.calendar_id)
      }
    } catch (error) {
      if (isGooglePushNotSupported(error)) {
        summary.unsupported.push(record.calendar_id)
        continue
      }
      if (isGoogleRateLimited(error) || !(error instanceof Error) || isAuthError(error)) {
        throw error
      }
      summary.failed.push({ calendar_id: record.calendar_id, error: error.message })
    }
  }

  return summary
}

function isAuthError(error: Error): boolean {
  return error instanceof TokenRefreshRequiredError || error instanceof AppAuthInvalidError
}

export function assertCalendarWritable(record: GoogleCalendarRecord): void {
  if (record.external_read_only) {
    throw new Error('This calendar is configured as external read-only')
  }
}
