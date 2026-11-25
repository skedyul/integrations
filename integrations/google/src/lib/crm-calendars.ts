import { instance } from 'skedyul'
import type { GoogleCalendarRecord } from '../events/types'
import { asGoogleCalendarRecord } from './calendar-record'
import type { CrmRow } from './crm-fields'

const CALENDAR_ENTITY = 'calendar'
const CALENDAR_LIST_LIMIT = 250

/** Writable per-install sync/watch state on the mapped calendar row. */
export type CrmCalendarSyncState = Partial<{
  sync_enabled: boolean | null
  sync_direction: 'push' | 'pull' | 'both' | null
  external_read_only: boolean | null
  sync_token: string | null
  last_synced_at: string | null
  watch_channel_id: string | null
  watch_resource_id: string | null
  watch_expiration: string | null
  watch_token: string | null
}>

/** Workplace calendar rows mapped from the Google calendar entity. */
export async function listCrmCalendarRecords(): Promise<GoogleCalendarRecord[]> {
  const records = await instance.list(CALENDAR_ENTITY, { limit: CALENDAR_LIST_LIMIT })
  return records.data.map((row) => asGoogleCalendarRecord(row as CrmRow))
}

async function findFirstCalendar(
  filter: Record<string, { eq: string }>,
): Promise<GoogleCalendarRecord | null> {
  const result = await instance.list(CALENDAR_ENTITY, { filter, limit: 1 })
  const row = result.data[0]
  return row ? asGoogleCalendarRecord(row as CrmRow) : null
}

/** The CRM calendar row for a Google calendar id (match field google_calendar_id). */
export async function findCrmCalendarRecord(
  googleCalendarId: string,
): Promise<GoogleCalendarRecord | null> {
  if (!googleCalendarId) return null
  return findFirstCalendar({ google_calendar_id: { eq: googleCalendarId } })
}

/** The CRM calendar row that owns a Google push channel. */
export async function findCrmCalendarByWatchChannel(
  channelId: string,
): Promise<GoogleCalendarRecord | null> {
  if (!channelId) return null
  return findFirstCalendar({ watch_channel_id: { eq: channelId } })
}

/** The CRM calendar row by instance id (event `calendar` relation). */
export async function getCrmCalendarRecord(
  crmInstanceId: string,
): Promise<GoogleCalendarRecord | null> {
  if (!crmInstanceId) return null
  const row = await instance.get(CALENDAR_ENTITY, crmInstanceId)
  return row ? asGoogleCalendarRecord(row as CrmRow) : null
}

/**
 * Write sync/watch state onto the calendar row. Uses the known CRM id, else
 * looks the row up by google_calendar_id. Returns false when no row exists
 * (the calendar was never imported), so callers can skip without failing.
 */
export async function updateCrmCalendarSyncState(
  record: Pick<GoogleCalendarRecord, 'calendar_id' | 'crm_instance_id'>,
  state: CrmCalendarSyncState,
): Promise<boolean> {
  let crmInstanceId = record.crm_instance_id ?? null
  if (!crmInstanceId) {
    crmInstanceId = (await findCrmCalendarRecord(record.calendar_id))?.crm_instance_id ?? null
  }
  if (!crmInstanceId) {
    return false
  }
  await instance.update(CALENDAR_ENTITY, crmInstanceId, state)
  return true
}
