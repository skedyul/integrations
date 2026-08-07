/**
 * Typed Google app event payloads.
 */

export type GoogleSyncDirection = 'push' | 'pull' | 'both'
export type GoogleSyncTrigger = 'manual' | 'push' | 'install' | 'tool'

export interface GoogleCalendarContext {
  calendar_id: string
  summary: string
}

export interface GoogleEventEntity {
  google_event_id: string
  status: string
  summary: string | null
  description: string | null
  start: string | null
  end: string | null
  timezone: string | null
  all_day: boolean
  recurrence: string[] | null
  attendees: Array<{ email: string; response_status?: string | null }>
  location: string | null
  html_link: string | null
  updated_at: string | null
  etag: string | null
}

export interface GoogleEventSyncContext {
  direction: GoogleSyncDirection
  trigger: GoogleSyncTrigger
}

export interface GoogleCalendarEventPayload {
  calendar: GoogleCalendarContext
  event: GoogleEventEntity
  sync: GoogleEventSyncContext
}

export interface GoogleSyncCompletedPayload {
  calendar: GoogleCalendarContext
  sync: GoogleEventSyncContext & {
    events_created: number
    events_updated: number
    events_deleted: number
  }
}

export interface GoogleSyncFailedPayload {
  calendar: GoogleCalendarContext
  sync: GoogleEventSyncContext & {
    error: string
  }
}

export interface GoogleEventCatalogPayloadMap {
  'calendar.event.created': GoogleCalendarEventPayload
  'calendar.event.updated': GoogleCalendarEventPayload
  'calendar.event.deleted': GoogleCalendarEventPayload
  'calendar.sync.completed': GoogleSyncCompletedPayload
  'calendar.sync.failed': GoogleSyncFailedPayload
}

export type GoogleEventName = keyof GoogleEventCatalogPayloadMap

export type GoogleEventEmitPayload<T extends GoogleEventName = GoogleEventName> =
  GoogleEventCatalogPayloadMap[T]

export interface GoogleCalendarRecord {
  id: string
  calendar_id: string
  summary?: string | null
  primary?: boolean | null
  sync_enabled?: boolean | null
  sync_direction?: GoogleSyncDirection | null
  external_read_only?: boolean | null
  sync_token?: string | null
  watch_channel_id?: string | null
  watch_resource_id?: string | null
  watch_expiration?: string | null
  watch_token?: string | null
  last_synced_at?: string | null
}
