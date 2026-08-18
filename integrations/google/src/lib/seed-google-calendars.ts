import type { GoogleCalendarRecord } from '../events/types'
import type { GoogleCalendarSummary } from '../services/calendar/client'

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
      : { sync_enabled: calendar.primary }),
    ...(extras?.sync_direction !== undefined
      ? { sync_direction: extras.sync_direction }
      : { sync_direction: 'both' }),
    ...(extras?.external_read_only !== undefined
      ? { external_read_only: extras.external_read_only }
      : {}),
    ...(extras?.sync_token !== undefined ? { sync_token: extras.sync_token } : {}),
    ...(extras?.watch_channel_id !== undefined
      ? { watch_channel_id: extras.watch_channel_id }
      : {}),
    ...(extras?.watch_resource_id !== undefined
      ? { watch_resource_id: extras.watch_resource_id }
      : {}),
    ...(extras?.watch_expiration !== undefined
      ? { watch_expiration: extras.watch_expiration }
      : {}),
    ...(extras?.watch_token !== undefined ? { watch_token: extras.watch_token } : {}),
    ...(extras?.last_synced_at !== undefined
      ? { last_synced_at: extras.last_synced_at }
      : {}),
  }
}
