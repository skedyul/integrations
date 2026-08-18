import { instance } from 'skedyul'
import type { GoogleCalendarRecord, GoogleSyncTrigger } from '../events/types'
import type { GoogleCalendarSummary } from '../services/calendar/client'
import {
  asGoogleCalendarRecord,
  CALENDAR_ENTITY_HANDLE,
  toCalendarWritePayload,
} from './calendar-record'
import { emitGoogleEvent } from './emit-google-event'

export interface SeededGoogleCalendar {
  record: GoogleCalendarRecord
  change: 'created' | 'updated'
  calendar: GoogleCalendarSummary
}

export async function upsertLinkedGoogleCalendars(options: {
  calendars: GoogleCalendarSummary[]
  appInstallationId: string
  trigger: GoogleSyncTrigger
  emitEvents?: boolean
}): Promise<{
  records: GoogleCalendarRecord[]
  seeded: SeededGoogleCalendar[]
  primaryCalendarId: string | null
}> {
  const seeded: SeededGoogleCalendar[] = []
  let primaryCalendarId: string | null = null

  for (const calendar of options.calendars) {
    const existing = await instance.list(CALENDAR_ENTITY_HANDLE, {
      filter: { google_calendar_id: { eq: calendar.calendar_id } },
      limit: 1,
    })

    const payload = toCalendarWritePayload({
      calendar_id: calendar.calendar_id,
      summary: calendar.summary,
      primary: calendar.primary,
      sync_enabled: calendar.primary,
      sync_direction: 'both',
      external_read_only: false,
    })

    if (calendar.primary) {
      primaryCalendarId = calendar.calendar_id
    }

    let record: GoogleCalendarRecord
    let change: 'created' | 'updated'

    if (existing.data.length > 0) {
      const current = asGoogleCalendarRecord(
        existing.data[0] as Record<string, unknown>,
      )
      await instance.update(
        CALENDAR_ENTITY_HANDLE,
        current.id,
        toCalendarWritePayload({
          summary: calendar.summary,
          primary: calendar.primary,
        }),
      )
      record = {
        ...current,
        summary: calendar.summary,
        primary: calendar.primary,
      }
      change = 'updated'
    } else {
      const created = (await instance.create(
        CALENDAR_ENTITY_HANDLE,
        payload,
      )) as unknown as Record<string, unknown>
      record = {
        ...asGoogleCalendarRecord(created),
        calendar_id: calendar.calendar_id,
        google_calendar_id: calendar.calendar_id,
        summary: calendar.summary,
        primary: calendar.primary,
        sync_enabled: calendar.primary,
        sync_direction: 'both',
        external_read_only: false,
      }
      change = 'created'
    }

    seeded.push({ record, change, calendar })

    if (options.emitEvents !== false) {
      await emitGoogleEvent(
        options.appInstallationId,
        change === 'created' ? 'calendar.created' : 'calendar.updated',
        {
          calendar: {
            calendar_id: calendar.calendar_id,
            summary: calendar.summary,
            primary: calendar.primary,
            timezone: calendar.time_zone,
            description: calendar.description,
          },
          sync: {
            trigger: options.trigger,
          },
        },
        `${options.trigger}:${calendar.calendar_id}`,
        options.trigger,
      )
    }
  }

  return {
    records: seeded.map((item) => item.record),
    seeded,
    primaryCalendarId,
  }
}

export function toCalendarEntityPayload(
  calendar: GoogleCalendarSummary,
  extras?: Partial<GoogleCalendarRecord>,
) {
  return {
    google_calendar_id: calendar.calendar_id,
    summary: calendar.summary,
    primary: calendar.primary,
    timezone: calendar.time_zone,
    description: calendar.description,
    ...(extras?.sync_enabled !== undefined
      ? { sync_enabled: extras.sync_enabled }
      : {}),
    ...(extras?.sync_direction !== undefined
      ? { sync_direction: extras.sync_direction }
      : {}),
    ...(extras?.external_read_only !== undefined
      ? { external_read_only: extras.external_read_only }
      : {}),
    ...(extras?.sync_token !== undefined ? { sync_token: extras.sync_token } : {}),
    ...(extras?.last_synced_at !== undefined
      ? { last_synced_at: extras.last_synced_at }
      : {}),
  }
}
