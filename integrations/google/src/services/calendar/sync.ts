import { instance } from 'skedyul'
import type { GoogleCalendarRecord } from '../../events/types'
import {
  asGoogleCalendarRecord,
  CALENDAR_ENTITY_HANDLE,
  toCalendarWritePayload,
} from '../../lib/calendar-record'

export async function loadGoogleCalendarRecord(
  calendarId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list(CALENDAR_ENTITY_HANDLE, {
    filter: { google_calendar_id: { eq: calendarId } },
    limit: 1,
  })

  const record = records.data[0] as Record<string, unknown> | undefined
  return record ? asGoogleCalendarRecord(record) : null
}

export async function loadLinkedGoogleCalendars(): Promise<GoogleCalendarRecord[]> {
  const records = await instance.list(CALENDAR_ENTITY_HANDLE, {
    filter: { sync_enabled: { eq: true } },
    limit: 250,
  })

  return (records.data as Record<string, unknown>[]).map(asGoogleCalendarRecord)
}

export async function loadGoogleCalendarRecordByWatchChannel(
  channelId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list(CALENDAR_ENTITY_HANDLE, {
    filter: { watch_channel_id: { eq: channelId } },
    limit: 1,
  })

  const record = records.data[0] as Record<string, unknown> | undefined
  return record ? asGoogleCalendarRecord(record) : null
}

export async function persistCalendarSyncToken(
  recordId: string,
  patch: { sync_token?: string | null; last_synced_at?: string },
): Promise<void> {
  await instance.update(
    CALENDAR_ENTITY_HANDLE,
    recordId,
    toCalendarWritePayload(patch),
  )
}
