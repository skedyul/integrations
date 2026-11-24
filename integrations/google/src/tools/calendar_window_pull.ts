import {
  instance,
  z,
  isRuntimeContext,
  CalendarWindowPullInputSchema,
} from 'skedyul'
import type { ToolDefinition, CalendarWindowPullInput } from 'skedyul'
import type { GoogleCalendarRecord, GoogleEventEntity } from '../events/types'
import { listCrmCalendarRecords } from '../lib/crm-calendars'
import { findCrmEventsByGoogleIds } from '../lib/crm-events'
import { decideEventUpsert, eventLookupIds } from '../lib/event-upsert-plan'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { toCalendarWindowPullPayload } from '../lib/seed-google-calendars'
import { ensureCalendarWatchesOnce } from '../lib/calendar-watches'
import {
  listGoogleCalendarEvents,
  listGoogleCalendars,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import {
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const PAGE_SIZE = 250
/** Per calendar: 10 × 250 events. Further pages are reported as truncated. */
export const MAX_PAGES_PER_CALENDAR = 10
/** Stop paging with headroom before the 60s tool timeout. */
const PAGING_BUDGET_MS = 40_000

const CalendarWindowPullOutputSchema = z.object({
  calendars_upserted: z.number().int().nonnegative(),
  events_upserted: z.number().int().nonnegative(),
  /** Cancelled in Google: existing rows marked cancelled, or cancelled occurrences stored. */
  events_cancelled: z.number().int().nonnegative(),
  /** Not newer than the CRM row, unknown cancellations, or pending write-backs. */
  events_skipped: z.number().int().nonnegative(),
  /** Calendars whose CRM row has sync_enabled false: events not pulled. */
  calendars_skipped: z.number().int().nonnegative(),
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
  crmByGoogleId: Map<string, GoogleCalendarRecord>,
): Promise<Map<string, string>> {
  const payloads = calendars.map((calendar) =>
    toCalendarWindowPullPayload(calendar, { isNew: !crmByGoogleId.has(calendar.calendar_id) }),
  )
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
  event: GoogleEventEntity,
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
    etag: event.etag,
    recurrence: event.recurrence,
    recurring_event_id: event.recurring_event_id,
    original_start: event.original_start,
    calendar: crmCalendarId,
  }
}

async function safeCrmCalendars(): Promise<GoogleCalendarRecord[]> {
  try {
    return await listCrmCalendarRecords()
  } catch (error) {
    console.warn('[Google] calendar_window_pull could not read CRM calendars:', error)
    return []
  }
}

type PulledCalendar = {
  calendar: GoogleCalendarSummary
  crmCalendarId: string
  events: GoogleEventEntity[]
}

export const calendarWindowPullRegistry: ToolDefinition<
  CalendarWindowPullInput,
  CalendarWindowPullOutput
> = {
  name: 'calendar_window_pull',
  label: 'Pull Calendar Window',
  ui: {
    title: 'Pulled calendar events',
    activeTitle: 'Pulling calendar events',
  },
  description:
    'List Google calendars and in-window events (all pages, bounded), then upsert them onto the mapped CRM models and apply cancellations. Skips calendars whose CRM row has sync disabled and Google copies that are not newer than the CRM row. Used by calendar LIST views; does not start a batch import.',
  timeout: 60_000,
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
      // Opens push channels for sync-enabled calendars that have none
      // (memoized per process). The platform renews them.
      await ensureCalendarWatchesOnce(context.appInstallationId, client)

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
          events_cancelled: 0,
          events_skipped: 0,
          calendars_skipped: 0,
          truncated: false,
          calendars: [],
        })
      }

      const crmCalendars = await safeCrmCalendars()
      const crmByGoogleId = new Map(
        crmCalendars
          .filter((record) => record.calendar_id.length > 0)
          .map((record) => [record.calendar_id, record]),
      )

      const crmIdByGoogleId = await upsertCalendars(calendars, crmByGoogleId)
      const startedAt = Date.now()
      let truncated = false
      let calendarsSkipped = 0
      const pulled: PulledCalendar[] = []

      for (const calendar of calendars) {
        const crmCalendarId = crmIdByGoogleId.get(calendar.calendar_id)
        if (!crmCalendarId) {
          continue
        }
        if (crmByGoogleId.get(calendar.calendar_id)?.sync_enabled === false) {
          calendarsSkipped += 1
          continue
        }

        const events: GoogleEventEntity[] = []
        let pageToken: string | undefined
        for (let pageIndex = 0; ; pageIndex += 1) {
          if (pageIndex >= MAX_PAGES_PER_CALENDAR || Date.now() - startedAt > PAGING_BUDGET_MS) {
            truncated = true
            break
          }
          const page = await listGoogleCalendarEvents(client, {
            calendarId: calendar.calendar_id,
            timeMin: input.window.startAt,
            timeMax: input.window.endAt,
            maxResults: PAGE_SIZE,
            pageToken,
            singleEvents: false,
          })
          for (const googleEvent of page.events) {
            if (!googleEvent.id) continue
            events.push(normalizeGoogleCalendarEvent(googleEvent))
          }
          if (!page.nextPageToken) {
            break
          }
          pageToken = page.nextPageToken
        }

        pulled.push({ calendar, crmCalendarId, events })
      }

      const existing = await findCrmEventsByGoogleIds(
        eventLookupIds(pulled.flatMap((entry) => entry.events)),
      )

      const eventItems: Record<string, unknown>[] = []
      let cancelled = 0
      let skipped = 0
      for (const { calendar, crmCalendarId, events } of pulled) {
        for (const event of events) {
          if (!event.google_event_id) continue
          const decision = decideEventUpsert(event, existing)
          if (decision.action === 'skip') {
            skipped += 1
            continue
          }
          if (decision.action === 'cancel') {
            cancelled += 1
            eventItems.push({
              ...decision.fields,
              calendar_id: calendar.calendar_id,
              calendar: crmCalendarId,
            })
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
        events_upserted: Math.max(0, eventsUpserted - cancelled),
        events_cancelled: cancelled,
        events_skipped: skipped,
        calendars_skipped: calendarsSkipped,
        truncated,
        calendars: calendars.map((calendar) => ({
          calendar_id: calendar.calendar_id,
          summary: calendar.summary,
        })),
      })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
