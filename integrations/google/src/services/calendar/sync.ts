import type { GoogleCalendarRecord } from '../../events/types'
import type { GoogleInstallEnv } from '../../lib/google_install_env'
import {
  filterSyncEnabledCalendars,
  recordFromGoogleSummary,
} from '../../lib/calendar-record'
import {
  findCrmCalendarRecord,
  listCrmCalendarRecords,
} from '../../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../../lib/google_client'
import { listGoogleCalendars } from './client'

export async function loadGoogleCalendarsFromGoogle(
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const { client } = await getAuthenticatedOAuthClient(env)
  const calendars = await listGoogleCalendars(client)
  return calendars.map((calendar) => recordFromGoogleSummary(calendar))
}

async function safeCrmCalendar(calendarId: string): Promise<GoogleCalendarRecord | null> {
  try {
    return await findCrmCalendarRecord(calendarId)
  } catch (error) {
    // Calendar map not configured (or CRM unavailable): fall back to Google.
    console.warn('[Google] Could not read CRM calendar row:', error)
    return null
  }
}

async function safeCrmCalendars(): Promise<GoogleCalendarRecord[]> {
  try {
    return await listCrmCalendarRecords()
  } catch (error) {
    console.warn('[Google] Could not list CRM calendar rows:', error)
    return []
  }
}

/**
 * One calendar for a write, webhook or import. The mapped CRM row wins: it
 * carries sync_token, watch state and the workplace's sync flags, and reading
 * it avoids a calendarList.list round trip on every write. Calendars that were
 * never imported fall back to the Google calendar list.
 */
export async function loadGoogleCalendarRecord(
  calendarId: string,
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord | null> {
  const crm = await safeCrmCalendar(calendarId)
  if (crm && crm.calendar_id) {
    return crm
  }
  const records = await loadGoogleCalendarsFromGoogle(env)
  return records.find((record) => record.calendar_id === calendarId) ?? null
}

/**
 * Calendars to sync: CRM rows with sync_enabled true. Before any calendar row
 * exists, fall back to the Google list (primary only, the import default).
 */
export async function loadLinkedGoogleCalendars(
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const crmCalendars = (await safeCrmCalendars()).filter(
    (calendar) => calendar.calendar_id.length > 0,
  )
  if (crmCalendars.length > 0) {
    return filterSyncEnabledCalendars(crmCalendars)
  }
  return filterSyncEnabledCalendars(await loadGoogleCalendarsFromGoogle(env))
}
