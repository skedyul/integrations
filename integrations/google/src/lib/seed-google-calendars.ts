import type { GoogleCalendarRecord } from '../events/types'
import type { GoogleCalendarSummary } from '../services/calendar/client'

/** Google-owned calendar metadata. Safe to write on every pull or import. */
export function toCalendarMetadataPayload(calendar: GoogleCalendarSummary) {
  return {
    google_calendar_id: calendar.calendar_id,
    summary: calendar.summary,
    primary: calendar.primary,
    timezone: calendar.time_zone,
    color: calendar.color,
    description: calendar.description,
  }
}

/**
 * Full calendar row for a FIRST create: metadata plus the workplace's sync
 * flags (sync_enabled defaults to primary-only, sync_direction to both).
 * Never use this for a row that already exists; it would reset the flags.
 */
export function toCalendarEntityPayload(
  calendar: GoogleCalendarSummary,
  extras?: Partial<GoogleCalendarRecord>,
) {
  return {
    ...toCalendarMetadataPayload(calendar),
    ...(extras?.sync_enabled != null
      ? { sync_enabled: extras.sync_enabled }
      : { sync_enabled: calendar.primary }),
    ...(extras?.sync_direction != null
      ? { sync_direction: extras.sync_direction }
      : { sync_direction: 'both' }),
    ...(extras?.external_read_only != null
      ? { external_read_only: extras.external_read_only }
      : {}),
    ...(extras?.sync_token ? { sync_token: extras.sync_token } : {}),
    ...(extras?.watch_channel_id ? { watch_channel_id: extras.watch_channel_id } : {}),
    ...(extras?.watch_resource_id ? { watch_resource_id: extras.watch_resource_id } : {}),
    ...(extras?.watch_expiration ? { watch_expiration: extras.watch_expiration } : {}),
    ...(extras?.watch_token ? { watch_token: extras.watch_token } : {}),
    ...(extras?.last_synced_at ? { last_synced_at: extras.last_synced_at } : {}),
  }
}

/** Import payload: flags only for calendars that have no CRM row yet. */
export function toCalendarImportPayload(
  calendar: GoogleCalendarSummary,
  options: { exists: boolean },
) {
  return options.exists ? toCalendarMetadataPayload(calendar) : toCalendarEntityPayload(calendar)
}

/**
 * Window pull upserts metadata; it never touches sync_enabled, and sets
 * sync_direction only when it creates the row.
 */
export function toCalendarWindowPullPayload(
  calendar: GoogleCalendarSummary,
  options?: { isNew?: boolean },
) {
  return {
    ...toCalendarMetadataPayload(calendar),
    ...(options?.isNew ? { sync_direction: 'both' as const } : {}),
  }
}
