import type { calendar_v3 } from 'googleapis'
import type { GoogleEventEntity } from '../../events/types'
import { mapGoogleAttendee, normalizeAttendeeEmail } from '../../lib/calendar-people'

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

  const originalStart = readDateTime(event.originalStartTime)

  const attendees = (event.attendees ?? [])
    .map((attendee) => mapGoogleAttendee(attendee))
    .filter((attendee): attendee is NonNullable<typeof attendee> => attendee != null)

  const organizerEmail =
    normalizeAttendeeEmail(event.organizer?.email) ??
    attendees.find((attendee) => attendee.organizer)?.email ??
    null

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
    recurring_event_id: event.recurringEventId ?? null,
    original_start: originalStart.value,
    attendees,
    organizer_email: organizerEmail,
    location: event.location ?? null,
    html_link: event.htmlLink ?? null,
    updated_at: event.updated ?? null,
    etag: event.etag ?? null,
  }
}

export type GoogleCalendarEventKind = 'series' | 'exception' | 'single'

export function classifyGoogleCalendarEvent(
  event: Pick<GoogleEventEntity, 'recurrence' | 'recurring_event_id'>,
): GoogleCalendarEventKind {
  if (event.recurring_event_id) {
    return 'exception'
  }
  if (Array.isArray(event.recurrence) && event.recurrence.length > 0) {
    return 'series'
  }
  return 'single'
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
