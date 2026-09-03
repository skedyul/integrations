import {
  instance,
  z,
  isRuntimeContext,
  AppAuthInvalidError,
  CalendarWindowPullInputSchema,
} from 'skedyul'
import type { ToolDefinition, CalendarWindowPullInput } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { toCalendarWindowPullPayload } from '../lib/seed-google-calendars'
import {
  listGoogleCalendarEvents,
  listGoogleCalendars,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import {
  createAuthError,
  createGoogleError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const DEFAULT_MAX_RESULTS_PER_CALENDAR = 250

const CalendarWindowPullOutputSchema = z.object({
  calendars_upserted: z.number().int().nonnegative(),
  events_upserted: z.number().int().nonnegative(),
  truncated: z.boolean(),
  calendars: z.array(
    z.object({
      calendar_id: z.string(),
      summary: z.string(),
    }),
  ),
})

type CalendarWindowPullOutput = z.infer<typeof CalendarWindowPullOutputSchema>

function readResultId(row: Record<string, unknown>): string | null {
  return typeof row.id === 'string' && row.id.length > 0 ? row.id : null
}

function readGoogleCalendarId(row: Record<string, unknown>): string | null {
  if (typeof row.google_calendar_id === 'string' && row.google_calendar_id.length > 0) {
    return row.google_calendar_id
  }
  if (typeof row.calendar_id === 'string' && row.calendar_id.length > 0) {
    return row.calendar_id
  }
  return null
}

async function upsertCalendars(
  calendars: GoogleCalendarSummary[],
): Promise<Map<string, string>> {
  const payloads = calendars.map((calendar) => toCalendarWindowPullPayload(calendar))
  const { results, errors } = await instance.upsertMany(
    'calendar',
    payloads,
    'google_calendar_id',
  )
  if (errors.length > 0) {
    const first = errors[0]
    throw new Error(
      first
        ? `Failed to upsert calendars: ${first.error}`
        : 'Failed to upsert calendars',
    )
  }

  const byGoogleId = new Map<string, string>()
  for (const result of results) {
    const row = result as Record<string, unknown>
    const googleId = readGoogleCalendarId(row)
    const crmId = readResultId(row)
    if (googleId && crmId) {
      byGoogleId.set(googleId, crmId)
    }
  }

  if (byGoogleId.size < payloads.length) {
    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index]
      const result = results[index] as Record<string, unknown> | undefined
      const crmId = result ? readResultId(result) : null
      if (payload && crmId && !byGoogleId.has(payload.google_calendar_id)) {
        byGoogleId.set(payload.google_calendar_id, crmId)
      }
    }
  }

  return byGoogleId
}

function toEventUpsertItem(
  event: ReturnType<typeof normalizeGoogleCalendarEvent>,
  calendar: GoogleCalendarSummary,
  crmCalendarId: string,
): Record<string, unknown> {
  return {
    google_event_id: event.google_event_id,
    calendar_id: calendar.calendar_id,
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    timezone: event.timezone,
    all_day: event.all_day,
    status: event.status,
    location: event.location,
    html_link: event.html_link,
    updated_at: event.updated_at,
    recurrence: event.recurrence,
    recurring_event_id: event.recurring_event_id,
    original_start: event.original_start,
    calendar: crmCalendarId,
  }
}

export const calendarWindowPullRegistry: ToolDefinition<
  CalendarWindowPullInput,
  CalendarWindowPullOutput
> = {
  name: 'calendar_window_pull',
  label: 'Pull Calendar Window',
  description:
    'List Google calendars and in-window events, then upsert them onto the mapped CRM models. Used by calendar LIST views; does not start a batch import.',
  inputSchema: CalendarWindowPullInputSchema,
  outputSchema: CalendarWindowPullOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const calendarConfigured = await instance.isConfigured('calendar')
      const eventConfigured = await instance.isConfigured('calendar_event')
      if (!calendarConfigured || !eventConfigured) {
        return createValidationError(
          'Calendar CRM maps are not configured for this installation',
        )
      }

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const listed = await listGoogleCalendars(client)
      const requestedIds = input.calendars?.ids?.filter((id) => id.length > 0)
      const requestedSet = requestedIds ? new Set(requestedIds) : null
      const calendars = listed.filter((calendar) => {
        if (!calendar.calendar_id) return false
        return requestedSet ? requestedSet.has(calendar.calendar_id) : true
      })

      if (calendars.length === 0) {
        return createSuccessResponse({
          calendars_upserted: 0,
          events_upserted: 0,
          truncated: false,
          calendars: [],
        })
      }

      const crmIdByGoogleId = await upsertCalendars(calendars)
      const eventItems: Record<string, unknown>[] = []
      let truncated = false
      const maxResults = DEFAULT_MAX_RESULTS_PER_CALENDAR

      for (const calendar of calendars) {
        const crmCalendarId = crmIdByGoogleId.get(calendar.calendar_id)
        if (!crmCalendarId) {
          continue
        }

        const page = await listGoogleCalendarEvents(client, {
          calendarId: calendar.calendar_id,
          timeMin: input.window.startAt,
          timeMax: input.window.endAt,
          maxResults,
          singleEvents: false,
        })
        if (page.nextPageToken) {
          truncated = true
        }

        for (const googleEvent of page.events) {
          if (!googleEvent.id) continue
          const event = normalizeGoogleCalendarEvent(googleEvent)
          if (!event.google_event_id || event.status === 'cancelled') {
            continue
          }
          eventItems.push(toEventUpsertItem(event, calendar, crmCalendarId))
        }
      }

      let eventsUpserted = 0
      if (eventItems.length > 0) {
        const { results, errors } = await instance.upsertMany(
          'calendar_event',
          eventItems,
          'google_event_id',
        )
        eventsUpserted = results.length
        if (errors.length > 0 && results.length === 0) {
          const first = errors[0]
          throw new Error(
            first
              ? `Failed to upsert calendar events: ${first.error}`
              : 'Failed to upsert calendar events',
          )
        }
      }

      return createSuccessResponse({
        calendars_upserted: crmIdByGoogleId.size,
        events_upserted: eventsUpserted,
        truncated,
        calendars: calendars.map((calendar) => ({
          calendar_id: calendar.calendar_id,
          summary: calendar.summary,
        })),
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
