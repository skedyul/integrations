import type { GoogleCalendarRecord, GoogleSyncDirection } from '../events/types'

export const CALENDAR_ENTITY_HANDLE = 'calendar'

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

/**
 * Normalize an instance.* row (entity handles after CRM-map reverse translation)
 * into the record shape tools and sync use.
 */
export function asGoogleCalendarRecord(
  row: Record<string, unknown>,
): GoogleCalendarRecord {
  const calendarId =
    readString(row.google_calendar_id) ?? readString(row.calendar_id) ?? ''

  return {
    id: String(row.id ?? ''),
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

export function toCalendarWritePayload(
  record: Partial<GoogleCalendarRecord> & { calendar_id?: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const calendarId = record.google_calendar_id ?? record.calendar_id
  if (calendarId !== undefined) payload.google_calendar_id = calendarId
  if (record.summary !== undefined) payload.summary = record.summary
  if (record.primary !== undefined) payload.primary = record.primary
  if (record.sync_enabled !== undefined) payload.sync_enabled = record.sync_enabled
  if (record.sync_direction !== undefined) payload.sync_direction = record.sync_direction
  if (record.external_read_only !== undefined) {
    payload.external_read_only = record.external_read_only
  }
  if (record.sync_token !== undefined) payload.sync_token = record.sync_token
  if (record.watch_channel_id !== undefined) {
    payload.watch_channel_id = record.watch_channel_id
  }
  if (record.watch_resource_id !== undefined) {
    payload.watch_resource_id = record.watch_resource_id
  }
  if (record.watch_expiration !== undefined) {
    payload.watch_expiration = record.watch_expiration
  }
  if (record.watch_token !== undefined) payload.watch_token = record.watch_token
  if (record.last_synced_at !== undefined) payload.last_synced_at = record.last_synced_at
  return payload
}
