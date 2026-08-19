import { instance } from 'skedyul'
import type { GoogleCalendarRecord } from '../events/types'
import { asGoogleCalendarRecord } from './calendar-record'

/** Workplace calendar rows mapped from the Google calendar entity. */
export async function listCrmCalendarRecords(): Promise<GoogleCalendarRecord[]> {
  const records = await instance.list('calendar', { limit: 250 })
  return records.data.map((row) =>
    asGoogleCalendarRecord(row as Record<string, unknown>),
  )
}
