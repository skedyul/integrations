import { instance } from 'skedyul'
import type { GoogleCalendarRecord } from '../../events/types'

export async function loadGoogleCalendarRecord(
  calendarId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list('google_calendar', {
    filter: { calendar_id: { eq: calendarId } },
    limit: 1,
  })

  const record = records.data[0] as unknown as GoogleCalendarRecord | undefined
  return record ?? null
}

export async function loadLinkedGoogleCalendars(): Promise<GoogleCalendarRecord[]> {
  const records = await instance.list('google_calendar', {
    filter: { sync_enabled: { eq: true } },
    limit: 250,
  })

  return records.data as unknown as GoogleCalendarRecord[]
}

export async function loadGoogleCalendarRecordByWatchChannel(
  channelId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list('google_calendar', {
    filter: { watch_channel_id: { eq: channelId } },
    limit: 1,
  })

  const record = records.data[0] as unknown as GoogleCalendarRecord | undefined
  return record ?? null
}

export async function persistCalendarSyncToken(
  recordId: string,
  patch: { sync_token?: string | null; last_synced_at?: string },
): Promise<void> {
  await instance.update('google_calendar', recordId, patch)
}
