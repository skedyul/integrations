import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { AppAuthInvalidError } from 'skedyul'
import { mapGoogleAuthError } from '../../lib/google_client'
import { buildEventDateTime } from './event-datetime'

export interface GoogleCalendarSummary {
  calendar_id: string
  summary: string
  primary: boolean
  access_role: string | null
  time_zone: string | null
  description: string | null
  color: string | null
}

export interface GoogleCalendarEventInput {
  summary?: string
  description?: string
  location?: string
  start?: string
  end?: string
  timezone?: string
  all_day?: boolean
  attendees?: string[]
  recurrence?: string[]
  status?: string
  google_event_id?: string
  recurring_event_id?: string
  original_start?: string
  send_updates?: 'all' | 'externalOnly' | 'none'
}

export function resolveSendUpdates(
  value: GoogleCalendarEventInput['send_updates'],
): 'all' | 'externalOnly' | 'none' {
  if (value === 'all' || value === 'externalOnly' || value === 'none') {
    return value
  }
  return 'externalOnly'
}

export interface GoogleFreeBusyInterval {
  start: string
  end: string
}

async function getCalendarApi(auth: OAuth2Client): Promise<calendar_v3.Calendar> {
  return google.calendar({ version: 'v3', auth })
}

function mapCalendarListEntry(entry: calendar_v3.Schema$CalendarListEntry): GoogleCalendarSummary {
  return {
    calendar_id: entry.id || '',
    summary: entry.summary || entry.id || 'Untitled calendar',
    primary: Boolean(entry.primary),
    access_role: entry.accessRole ?? null,
    time_zone: entry.timeZone ?? null,
    description: entry.description ?? null,
    color: entry.backgroundColor ?? null,
  }
}

export async function listGoogleCalendars(auth: OAuth2Client): Promise<GoogleCalendarSummary[]> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.calendarList.list({ maxResults: 250 })
    return (response.data.items ?? [])
      .filter((item) => Boolean(item.id))
      .map((item) => mapCalendarListEntry(item))
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export async function listGoogleCalendarEvents(
  auth: OAuth2Client,
  options: {
    calendarId: string
    syncToken?: string | null
    timeMin?: string
    timeMax?: string
    updatedMin?: string
    maxResults?: number
    pageToken?: string
    /**
     * Google expands recurring series when true. Import and incremental sync
     * must keep this false so CRM stores series masters + exceptions only.
     */
    singleEvents?: boolean
  },
): Promise<{
  events: calendar_v3.Schema$Event[]
  nextSyncToken?: string | null
  nextPageToken?: string | null
}> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.list({
      calendarId: options.calendarId,
      syncToken: options.syncToken || undefined,
      timeMin: options.syncToken ? undefined : options.timeMin,
      timeMax: options.syncToken ? undefined : options.timeMax,
      updatedMin: options.updatedMin,
      maxResults: options.maxResults ?? 250,
      pageToken: options.pageToken,
      singleEvents: options.singleEvents ?? false,
      showDeleted: true,
    })

    return {
      events: response.data.items ?? [],
      nextSyncToken: response.data.nextSyncToken ?? null,
      nextPageToken: response.data.nextPageToken ?? null,
    }
  } catch (error) {
    const status = (error as { code?: number }).code
    if (status === 410) {
      const syncError = new Error('SYNC_TOKEN_INVALID')
      syncError.name = 'SyncTokenInvalidError'
      throw syncError
    }
    throw mapGoogleAuthError(error)
  }
}

export async function getGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.get({ calendarId, eventId })
    if (!response.data.id) {
      throw new Error('Google event response did not include an id')
    }
    return response.data
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

/**
 * Google event body from mapped fields. Undefined fields are omitted (left as
 * they are on patch); empty strings and empty arrays are sent, which clears
 * them in Google. No colorId: the event keeps its calendar's color.
 */
export function toGoogleEventBody(
  input: GoogleCalendarEventInput,
  options?: { includeRecurrence?: boolean },
): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {}
  if (input.summary !== undefined) body.summary = input.summary
  if (input.description !== undefined) body.description = input.description
  if (input.location !== undefined) body.location = input.location
  const start = buildEventDateTime(input, 'start')
  if (start) body.start = start
  const end = buildEventDateTime(input, 'end')
  if (end) body.end = end
  if (input.attendees !== undefined) {
    body.attendees = input.attendees.map((email) => ({ email }))
  }
  if (options?.includeRecurrence !== false && input.recurrence !== undefined) {
    body.recurrence = input.recurrence
  }
  if (input.status !== undefined) body.status = input.status
  return body
}

/** events.insert; `eventId` sets a client-supplied id so retries hit 409. */
export async function insertGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  input: GoogleCalendarEventInput,
  options?: { eventId?: string },
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        ...toGoogleEventBody(input),
        ...(options?.eventId ? { id: options.eventId } : {}),
      },
      sendUpdates: resolveSendUpdates(input.send_updates),
    })

    if (!response.data.id) {
      throw new Error('Google did not return a created event id')
    }

    return response.data
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

/** events.patch, with If-Match when an etag is known. */
export async function patchGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  input: GoogleCalendarEventInput,
  options?: { ifMatch?: string | null },
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.patch(
      {
        calendarId,
        eventId,
        requestBody: toGoogleEventBody(input, {
          includeRecurrence: input.recurrence != null,
        }),
        sendUpdates: resolveSendUpdates(input.send_updates),
      },
      options?.ifMatch ? { headers: { 'If-Match': options.ifMatch } } : undefined,
    )

    if (!response.data.id) {
      throw new Error('Google did not return an updated event id')
    }

    return response.data
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

/** Back-compat alias: patch without If-Match. */
export async function updateGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  input: GoogleCalendarEventInput,
): Promise<calendar_v3.Schema$Event> {
  return patchGoogleCalendarEvent(auth, calendarId, eventId, input)
}

/** events.move: change the event's calendar (organizer). */
export async function moveGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  destinationCalendarId: string,
  sendUpdates?: GoogleCalendarEventInput['send_updates'],
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.move({
      calendarId,
      eventId,
      destination: destinationCalendarId,
      sendUpdates: resolveSendUpdates(sendUpdates),
    })
    if (!response.data.id) {
      throw new Error('Google did not return a moved event id')
    }
    return response.data
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export async function deleteGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  options?: { sendUpdates?: GoogleCalendarEventInput['send_updates'] },
): Promise<void> {
  try {
    const calendar = await getCalendarApi(auth)
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: resolveSendUpdates(options?.sendUpdates),
    })
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export async function queryGoogleFreeBusy(
  auth: OAuth2Client,
  options: {
    calendarIds: string[]
    timeMin: string
    timeMax: string
    timeZone?: string
  },
): Promise<Record<string, GoogleFreeBusyInterval[]>> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        timeZone: options.timeZone,
        items: options.calendarIds.map((id) => ({ id })),
      },
    })

    const calendars = response.data.calendars ?? {}
    const result: Record<string, GoogleFreeBusyInterval[]> = {}

    for (const [calendarId, payload] of Object.entries(calendars)) {
      result[calendarId] = (payload.busy ?? []).map((interval) => ({
        start: interval.start || '',
        end: interval.end || '',
      }))
    }

    return result
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export function assertWritableCalendar(accessRole: string | null | undefined): void {
  if (accessRole === 'reader' || accessRole === 'freeBusyReader') {
    throw new AppAuthInvalidError('Calendar is read-only')
  }
}
