import type { calendar_v3 } from 'googleapis'
import type { GoogleEventEntity } from '../events/types'

export type GoogleEventAttendee = NonNullable<GoogleEventEntity['attendees']>[number]

export type GoogleUserPayload = {
  email: string
  display_name: string | null
}

export type GoogleAttendeePayload = {
  event_attendee_key: string
  email: string
  display_name: string | null
  response_status: string | null
  organizer: boolean
  optional: boolean
  self: boolean
}

export function eventAttendeeKey(googleEventId: string, email: string): string {
  return `${googleEventId}:${email.trim().toLowerCase()}`
}

export function normalizeAttendeeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null
  }
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

export function mapGoogleAttendee(
  attendee: calendar_v3.Schema$EventAttendee,
): GoogleEventAttendee | null {
  const email = normalizeAttendeeEmail(attendee.email)
  if (!email) {
    return null
  }
  return {
    email,
    response_status: attendee.responseStatus ?? null,
    display_name: attendee.displayName ?? null,
    organizer: Boolean(attendee.organizer),
    optional: Boolean(attendee.optional),
    self: Boolean(attendee.self),
  }
}

export function collectUsersFromAttendees(
  attendees: GoogleEventAttendee[],
): GoogleUserPayload[] {
  const byEmail = new Map<string, GoogleUserPayload>()
  for (const attendee of attendees) {
    const email = normalizeAttendeeEmail(attendee.email)
    if (!email || byEmail.has(email)) {
      continue
    }
    byEmail.set(email, {
      email,
      display_name: attendee.display_name ?? null,
    })
  }
  return [...byEmail.values()]
}

export function collectAttendeesForEvent(
  googleEventId: string,
  attendees: GoogleEventAttendee[],
): GoogleAttendeePayload[] {
  return attendees.flatMap((attendee) => {
    const email = normalizeAttendeeEmail(attendee.email)
    if (!email) {
      return []
    }
    return [
      {
        event_attendee_key: eventAttendeeKey(googleEventId, email),
        email,
        display_name: attendee.display_name ?? null,
        response_status: attendee.response_status ?? null,
        organizer: Boolean(attendee.organizer),
        optional: Boolean(attendee.optional),
        self: Boolean(attendee.self),
      },
    ]
  })
}

export function collectUsersFromEvent(input: {
  attendees: GoogleEventAttendee[]
  organizer_email?: string | null
  organizer_display_name?: string | null
}): GoogleUserPayload[] {
  const byEmail = new Map<string, GoogleUserPayload>()
  const organizerEmail = normalizeAttendeeEmail(input.organizer_email)
  if (organizerEmail && !byEmail.has(organizerEmail)) {
    byEmail.set(organizerEmail, {
      email: organizerEmail,
      display_name: input.organizer_display_name ?? null,
    })
  }
  for (const user of collectUsersFromAttendees(input.attendees)) {
    const existing = byEmail.get(user.email)
    if (!existing) {
      byEmail.set(user.email, user)
      continue
    }
    if (!existing.display_name && user.display_name) {
      byEmail.set(user.email, user)
    }
  }
  return [...byEmail.values()]
}

export function buildCalendarPeopleCascadeItems(input: {
  googleEventId: string
  calendarId: string
  event: GoogleEventEntity
}): {
  users: Record<string, unknown>[]
  attendees: Record<string, unknown>[]
  organizerMatch: { __crmMatch: string } | null
} {
  const users = collectUsersFromEvent({
    attendees: input.event.attendees,
    organizer_email: input.event.organizer_email,
  })
  const attendees = collectAttendeesForEvent(input.googleEventId, input.event.attendees)
  const organizerMatchEmail = organizerEmailFromEvent(input.event)

  return {
    users: users.map((user) => ({
      user: {
        email: user.email,
        display_name: user.display_name,
      },
    })),
    attendees: attendees.map((attendee) => ({
      attendee: {
        ...attendee,
        event: { __crmMatch: input.googleEventId },
        user: { __crmMatch: attendee.email },
      },
      event: { __crmMatch: input.googleEventId },
      user: { __crmMatch: attendee.email },
    })),
    organizerMatch: organizerMatchEmail
      ? { __crmMatch: organizerMatchEmail }
      : null,
  }
}

export function organizerEmailFromEvent(
  event: Pick<GoogleEventEntity, 'attendees'> & { organizer_email?: string | null },
): string | null {
  if (event.organizer_email) {
    return normalizeAttendeeEmail(event.organizer_email)
  }
  const organizer = event.attendees.find((attendee) => attendee.organizer)
  return organizer ? normalizeAttendeeEmail(organizer.email) : null
}
