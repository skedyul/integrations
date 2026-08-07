import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { AppAuthInvalidError } from 'skedyul'
import { mapGoogleAuthError } from '../../lib/google_client'

export interface GoogleCalendarSummary {
  calendar_id: string
  summary: string
  primary: boolean
  access_role: string | null
  time_zone: string | null
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
      singleEvents: true,
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

function buildEventDateTime(input: GoogleCalendarEventInput, kind: 'start' | 'end') {
  const value = kind === 'start' ? input.start : input.end
  if (!value) {
    return undefined
  }

  if (input.all_day) {
    return { date: value.slice(0, 10) }
  }

  return {
    dateTime: value,
    timeZone: input.timezone || undefined,
  }
}

export async function createGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  input: GoogleCalendarEventInput,
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: buildEventDateTime(input, 'start'),
        end: buildEventDateTime(input, 'end'),
        attendees: input.attendees?.map((email) => ({ email })),
        recurrence: input.recurrence,
      },
    })

    if (!response.data.id) {
      throw new Error('Google did not return a created event id')
    }

    return response.data
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export async function updateGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  input: GoogleCalendarEventInput,
): Promise<calendar_v3.Schema$Event> {
  try {
    const calendar = await getCalendarApi(auth)
    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: buildEventDateTime(input, 'start'),
        end: buildEventDateTime(input, 'end'),
        attendees: input.attendees?.map((email) => ({ email })),
        recurrence: input.recurrence,
      },
    })

    if (!response.data.id) {
      throw new Error('Google did not return an updated event id')
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
): Promise<void> {
  try {
    const calendar = await getCalendarApi(auth)
    await calendar.events.delete({ calendarId, eventId })
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
