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

export const CALENDAR_PUSH_WEBHOOK_NAME = 'calendar_push'

/** The webhook registration a calendar's push channel points at. */
export type CalendarPushRegistration = {
  id: string
  url: string
  /** True when the platform renews it before it expires */
  autoRenew: boolean
}

/** This installation's calendar_push registrations, by Google calendar id. */
export async function listCalendarPushRegistrations(): Promise<
  Map<string, CalendarPushRegistration>
> {
  const { webhooks } = await webhook.list({ name: CALENDAR_PUSH_WEBHOOK_NAME })
  const byCalendar = new Map<string, CalendarPushRegistration>()
  for (const item of webhooks) {
    const calendarId = item.context?.calendar_id
    if (typeof calendarId !== 'string' || byCalendar.has(calendarId)) continue
    byCalendar.set(calendarId, { id: item.id, url: item.url, autoRenew: item.autoRenew === true })
  }
  return byCalendar
}

/**
 * Each calendar's channel points at its own registration (context
 * `{ calendar_id }`), so the platform can renew that channel on its own
 * through the webhook's `renew` handler.
 */
export async function ensureCalendarPushRegistration(
  calendarId: string,
  known?: Map<string, CalendarPushRegistration>,
): Promise<CalendarPushRegistration> {
  const registrations = known ?? (await listCalendarPushRegistrations())
  const existing = registrations.get(calendarId)
  if (existing) return existing
  const created = await webhook.create(CALENDAR_PUSH_WEBHOOK_NAME, { calendar_id: calendarId })
  const registration = { id: created.id, url: created.url, autoRenew: false }
  registrations.set(calendarId, registration)
  return registration
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
 * Open a new push channel on the calendar's registration URL with a random
 * secret token and store channel id, resource id, expiry and token on the CRM
 * calendar row (the webhook checks pings against them). A channel that
 * cannot be stored is stopped again.
 */
async function openPersistedChannel(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  registration: Pick<CalendarPushRegistration, 'url'>,
): Promise<GoogleCalendarRecord> {
  const watch = await startCalendarWatch(auth, {
    calendarId: record.calendar_id,
    webhookUrl: registration.url,
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

async function stopStoredChannel(auth: OAuth2Client, record: GoogleCalendarRecord): Promise<void> {
  if (hasChannel(record)) {
    await stopCalendarWatch(auth, {
      channelId: record.watch_channel_id as string,
      resourceId: record.watch_resource_id as string,
    })
  }
}

/**
 * Replace the calendar's channel with a new one on the same registration URL
 * (new channel first, then the old one is stopped, so no notification gap).
 * Used by the platform's renewal (`calendar_push.renew`), which stores the
 * returned expiry itself.
 */
export async function renewCalendarChannel(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  registration: Pick<CalendarPushRegistration, 'url'>,
): Promise<GoogleCalendarRecord> {
  const next = await openPersistedChannel(auth, record, registration)
  await stopStoredChannel(auth, record)
  return next
}

/**
 * Keep one live channel for the calendar, renewed by the platform: reuse a
 * stored channel that is not close to expiry and whose registration is
 * auto-renewing, otherwise open a new one first, hand its expiry to the
 * platform (`webhook.update(..., { autoRenew: true })`) and then stop the old
 * one.
 */
export async function ensureCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  now: number = Date.now(),
  registrations?: Map<string, CalendarPushRegistration>,
): Promise<GoogleCalendarRecord> {
  const registration = await ensureCalendarPushRegistration(record.calendar_id, registrations)
  if (
    hasChannel(record) &&
    record.watch_token &&
    registration.autoRenew &&
    !watchNeedsRenewal(record.watch_expiration, now)
  ) {
    return record
  }

  const next = await openPersistedChannel(auth, record, registration)
  try {
    if (next.watch_expiration) {
      await webhook.update(registration.id, {
        expiresAt: next.watch_expiration,
        autoRenew: true,
      })
      registration.autoRenew = true
    }
  } catch (error) {
    // Without a lease nothing would renew the channel: undo it.
    await stopStoredChannel(auth, next)
    await updateCrmCalendarSyncState(next, CLEARED_WATCH).catch(() => undefined)
    throw error
  }
  await stopStoredChannel(auth, record)
  return next
}

/**
 * Stop the calendar's channel, clear the stored watch fields and delete its
 * registration (which also ends the platform's renewal).
 */
export async function removeCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
  options?: { clear?: boolean; keepRegistration?: boolean },
): Promise<void> {
  await stopStoredChannel(auth, record)
  if (options?.clear !== false && (hasChannel(record) || record.watch_token)) {
    await updateCrmCalendarSyncState(record, CLEARED_WATCH)
  }
  if (!options?.keepRegistration && record.calendar_id) {
    await webhook.deleteByName(CALENDAR_PUSH_WEBHOOK_NAME, {
      filter: { calendar_id: record.calendar_id },
    })
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
 * Open channels for sync-enabled calendars that have none (or whose channel
 * is not renewed by the platform), and stop channels on calendars whose sync
 * is off. Renewal itself is the platform's job (`calendar_push.renew`).
 * Auth and rate-limit errors abort the run; other per-calendar errors are
 * collected.
 */
export async function reconcileCalendarWatches(
  auth: OAuth2Client,
  records: GoogleCalendarRecord[],
  now: number = Date.now(),
): Promise<WatchReconcileSummary> {
  const registrations = await listCalendarPushRegistrations()
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
      const next = await ensureCalendarWatch(auth, record, now, registrations)
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
