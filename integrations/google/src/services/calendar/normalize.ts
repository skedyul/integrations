import type { calendar_v3 } from 'googleapis'
import type { GoogleEventEntity } from '../../events/types'

function readDateTime(
  value: calendar_v3.Schema$EventDateTime | undefined | null,
): { value: string | null; timezone: string | null; allDay: boolean } {
  if (!value) {
    return { value: null, timezone: null, allDay: false }
  }

  if (value.date) {
    return { value: value.date, timezone: value.timeZone ?? null, allDay: true }
  }

  return {
    value: value.dateTime ?? null,
    timezone: value.timeZone ?? null,
    allDay: false,
  }
}

export function normalizeGoogleCalendarEvent(
  event: calendar_v3.Schema$Event,
): GoogleEventEntity {
  const start = readDateTime(event.start)
  const end = readDateTime(event.end)

  return {
    google_event_id: event.id || '',
    status: event.status || 'confirmed',
    summary: event.summary ?? null,
    description: event.description ?? null,
    start: start.value,
    end: end.value,
    timezone: start.timezone ?? end.timezone,
    all_day: start.allDay || end.allDay,
    recurrence: event.recurrence ?? null,
    attendees: (event.attendees ?? []).map((attendee) => ({
      email: attendee.email || '',
      response_status: attendee.responseStatus ?? null,
    })),
    location: event.location ?? null,
    html_link: event.htmlLink ?? null,
    updated_at: event.updated ?? null,
    etag: event.etag ?? null,
  }
}

export function isNewlyCreatedEvent(event: calendar_v3.Schema$Event): boolean {
  if (!event.created || !event.updated) {
    return false
  }

  return event.created === event.updated
}

export function resolveEventChangeType(
  event: calendar_v3.Schema$Event,
): 'created' | 'updated' | 'deleted' {
  if (event.status === 'cancelled') {
    return 'deleted'
  }

  if (isNewlyCreatedEvent(event)) {
    return 'created'
  }

  return 'updated'
}
