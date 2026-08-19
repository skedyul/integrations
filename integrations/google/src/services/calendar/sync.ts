import type { GoogleCalendarRecord } from '../../events/types'
import type { GoogleInstallEnv } from '../../lib/google_install_env'
import {
  filterSyncEnabledCalendars,
  overlayCrmCalendarState,
  recordFromGoogleSummary,
} from '../../lib/calendar-record'
import { listCrmCalendarRecords } from '../../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../../lib/google_client'
import { listGoogleCalendars } from './client'

export async function loadGoogleCalendarsFromGoogle(
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const { client } = await getAuthenticatedOAuthClient(env)
  const calendars = await listGoogleCalendars(client)
  return calendars.map((calendar) => recordFromGoogleSummary(calendar))
}

export async function loadGoogleCalendarRecord(
  calendarId: string,
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord | null> {
  const records = await loadGoogleCalendarsFromGoogle(env)
  return records.find((record) => record.calendar_id === calendarId) ?? null
}

/** Google calendars that are sync-enabled on the mapped CRM calendar model. */
export async function loadLinkedGoogleCalendars(
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const fromGoogle = await loadGoogleCalendarsFromGoogle(env)
  const crmCalendars = await listCrmCalendarRecords()
  const merged = overlayCrmCalendarState(fromGoogle, crmCalendars)
  return filterSyncEnabledCalendars(merged)
}
