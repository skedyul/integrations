import type { OAuth2Client } from 'google-auth-library'
import type { GoogleCalendarRecord } from '../events/types'
import { ensureCalendarWatch } from './calendar_link'
import { loadGoogleCalendarRecord, syncGoogleCalendar } from '../services/calendar/sync'

export async function runPrimaryCalendarBackfill(options: {
  auth: OAuth2Client
  appInstallationId: string
  primaryCalendarId: string | null
  log?: {
    info: (message: string) => void
    warn: (message: string, error?: unknown) => void
  }
}): Promise<void> {
  if (!options.primaryCalendarId) {
    return
  }

  try {
    const record = await loadGoogleCalendarRecord(options.primaryCalendarId)
    if (!record?.sync_enabled) {
      return
    }

    const watched = await ensureCalendarWatch(options.auth, record as GoogleCalendarRecord)
    await syncGoogleCalendar({
      auth: options.auth,
      appInstallationId: options.appInstallationId,
      calendarRecord: watched,
      trigger: 'install',
      correlationId: `install-${options.primaryCalendarId}-${Date.now()}`,
    })
    options.log?.info(
      `[Google OAuth] Ran install backfill sync for ${options.primaryCalendarId}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
    options.log?.warn(
      `[Google OAuth] Install backfill failed for ${options.primaryCalendarId}: ${message}`,
      error,
    )
  }
}
