import type { GoogleCalendarRecord, GoogleSyncDirection } from '../events/types'
import type { GoogleCalendarSummary } from '../services/calendar/client'
import {
  readEntityBoolean,
  readEntityString,
  readRowId,
  type CrmRow,
} from './crm-fields'

const SYNC_DIRECTIONS = new Set<GoogleSyncDirection>(['push', 'pull', 'both'])

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readSyncDirection(value: unknown): GoogleSyncDirection | null {
  return typeof value === 'string' && SYNC_DIRECTIONS.has(value as GoogleSyncDirection)
    ? (value as GoogleSyncDirection)
    : null
}

/** Build the in-memory calendar record used by tools and batch jobs. */
export function recordFromGoogleSummary(
  calendar: GoogleCalendarSummary,
  extras?: Partial<GoogleCalendarRecord>,
): GoogleCalendarRecord {
  return {
    id: calendar.calendar_id,
    calendar_id: calendar.calendar_id,
    google_calendar_id: calendar.calendar_id,
    crm_instance_id: extras?.crm_instance_id ?? null,
    summary: calendar.summary,
    primary: calendar.primary,
    timezone: calendar.time_zone,
    color: calendar.color,
    description: calendar.description,
    sync_enabled: extras?.sync_enabled ?? calendar.primary,
    sync_direction: extras?.sync_direction ?? 'both',
    external_read_only: extras?.external_read_only ?? false,
    sync_token: extras?.sync_token ?? null,
    watch_channel_id: extras?.watch_channel_id ?? null,
    watch_resource_id: extras?.watch_resource_id ?? null,
    watch_expiration: extras?.watch_expiration ?? null,
    watch_token: extras?.watch_token ?? null,
    last_synced_at: extras?.last_synced_at ?? null,
  }
}

/** Overlay CRM sync flags onto Google-listed calendars by calendar id. */
export function overlayCrmCalendarState(
  googleCalendars: GoogleCalendarRecord[],
  crmCalendars: GoogleCalendarRecord[],
): GoogleCalendarRecord[] {
  const crmById = new Map(
    crmCalendars
      .filter((calendar) => calendar.calendar_id.length > 0)
      .map((calendar) => [calendar.calendar_id, calendar]),
  )

  return googleCalendars.map((google) => {
    const crm = crmById.get(google.calendar_id)
    if (!crm) return google
    return {
      ...google,
      id: crm.id || google.id,
      crm_instance_id: crm.crm_instance_id ?? google.crm_instance_id ?? null,
      sync_enabled: crm.sync_enabled ?? google.sync_enabled,
      sync_direction: crm.sync_direction ?? google.sync_direction,
      external_read_only: crm.external_read_only ?? google.external_read_only,
      sync_token: crm.sync_token ?? google.sync_token,
      watch_channel_id: crm.watch_channel_id ?? google.watch_channel_id,
      watch_resource_id: crm.watch_resource_id ?? google.watch_resource_id,
      watch_expiration: crm.watch_expiration ?? google.watch_expiration,
      watch_token: crm.watch_token ?? google.watch_token,
      last_synced_at: crm.last_synced_at ?? google.last_synced_at,
    }
  })
}

export function filterSyncEnabledCalendars(
  calendars: GoogleCalendarRecord[],
): GoogleCalendarRecord[] {
  return calendars.filter((calendar) => calendar.sync_enabled === true)
}

export function asGoogleCalendarRecord(row: CrmRow): GoogleCalendarRecord {
  const read = (field: string) => readEntityString(row, 'calendar', field)
  const calendarId = read('google_calendar_id') ?? readString(row.calendar_id) ?? ''
  const crmInstanceId = readRowId(row)

  return {
    id: crmInstanceId ?? calendarId,
    calendar_id: calendarId,
    google_calendar_id: calendarId,
    crm_instance_id: crmInstanceId,
    summary: read('summary') ?? readString(row.name),
    primary: readEntityBoolean(row, 'calendar', 'primary'),
    timezone: read('timezone'),
    color: read('color'),
    description: read('description'),
    sync_enabled: readEntityBoolean(row, 'calendar', 'sync_enabled'),
    sync_direction: readSyncDirection(read('sync_direction')),
    external_read_only: readEntityBoolean(row, 'calendar', 'external_read_only'),
    sync_token: read('sync_token'),
    watch_channel_id: read('watch_channel_id'),
    watch_resource_id: read('watch_resource_id'),
    watch_expiration: read('watch_expiration'),
    watch_token: read('watch_token'),
    last_synced_at: read('last_synced_at'),
  }
}
