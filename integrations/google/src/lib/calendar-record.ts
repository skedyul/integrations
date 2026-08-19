import type { GoogleCalendarRecord, GoogleSyncDirection } from '../events/types'
import type { GoogleCalendarSummary } from '../services/calendar/client'

const SYNC_DIRECTIONS = new Set<GoogleSyncDirection>(['push', 'pull', 'both'])

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
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
    summary: calendar.summary,
    primary: calendar.primary,
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

export function asGoogleCalendarRecord(
  row: Record<string, unknown>,
): GoogleCalendarRecord {
  const calendarId =
    readString(row.google_calendar_id) ?? readString(row.calendar_id) ?? ''

  return {
    id: String(row.id ?? calendarId),
    calendar_id: calendarId,
    google_calendar_id: calendarId,
    summary: readString(row.summary) ?? readString(row.name),
    primary: readBoolean(row.primary),
    sync_enabled: readBoolean(row.sync_enabled),
    sync_direction: readSyncDirection(row.sync_direction),
    external_read_only: readBoolean(row.external_read_only),
    sync_token: readString(row.sync_token),
    watch_channel_id: readString(row.watch_channel_id),
    watch_resource_id: readString(row.watch_resource_id),
    watch_expiration: readString(row.watch_expiration),
    watch_token: readString(row.watch_token),
    last_synced_at: readString(row.last_synced_at),
  }
}
