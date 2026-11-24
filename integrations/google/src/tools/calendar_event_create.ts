import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import {
  asBoolean,
  attendeeEmails,
  blankToUndefined,
  parseRecurrenceLines,
} from '../lib/calendar-event-update-patch'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import { resolveSeriesInstanceId } from '../lib/series-instance'
import {
  getGoogleCalendarEvent,
  type GoogleCalendarEventInput,
} from '../services/calendar/client'
import {
  asGoogleEventId,
  RECURRING_EVENT_FALLBACK_TIMEZONE,
} from '../services/calendar/event-datetime'
import { skedyulGoogleEventId } from '../services/calendar/event-ids'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import { insertEventIdempotent, patchSeriesInstance } from '../services/calendar/writes'
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const optionalString = z.preprocess(blankToUndefined, z.string().optional())

const CalendarEventCreateInputSchema = z.object({
  calendar_id: z.string().min(1),
  summary: z.string().min(1),
  description: optionalString,
  location: optionalString,
  start: z.string().min(1),
  end: z.string().min(1),
  timezone: optionalString,
  all_day: z.preprocess(
    blankToUndefined,
    z.union([z.boolean(), z.string()]).optional(),
  ),
  attendees: z.preprocess((value) => {
    if (typeof value === 'string') {
      try {
        return attendeeEmails(JSON.parse(value))
      } catch {
        return attendeeEmails(value)
      }
    }
    return attendeeEmails(value)
  }, z.array(z.string().email()).optional()),
  /** RRULE/EXDATE/RDATE lines (array, JSON array string, or newline text). */
  recurrence: z.preprocess(parseRecurrenceLines, z.array(z.string()).optional()),
  status: optionalString,
  google_event_id: optionalString,
  recurring_event_id: optionalString,
  original_start: optionalString,
  /**
   * CRM instance id of the row being pushed. The Google id is derived from it
   * (`sk` + sha256), so a retried create is idempotent.
   */
  crm_instance_id: optionalString,
  send_updates: z.enum(['all', 'externalOnly', 'none']).optional(),
  /** Set false on CRM outbound create so inbound webhook sync does not duplicate the row. */
  emit_event: z.preprocess(
    blankToUndefined,
    z.union([z.boolean(), z.string()]).optional(),
  ),
})

const CalendarEventCreateOutputSchema = z.object({
  event: z.object({
    google_event_id: z.string(),
    status: z.string(),
    summary: z.string().nullable(),
    description: z.string().nullable(),
    start: z.string().nullable(),
    end: z.string().nullable(),
    timezone: z.string().nullable(),
    all_day: z.boolean(),
    recurrence: z.array(z.string()).nullable(),
    recurring_event_id: z.string().nullable(),
    original_start: z.string().nullable(),
    attendees: z.array(
      z.object({
        email: z.string(),
        response_status: z.string().nullable().optional(),
      }),
    ),
    location: z.string().nullable(),
    html_link: z.string().nullable(),
    updated_at: z.string().nullable(),
    etag: z.string().nullable(),
  }),
  /** insert: new Google event; existing: already in Google (retry or stored id); instance: series occurrence patched. */
  write: z.enum(['insert', 'existing', 'instance']),
})

type CalendarEventCreateInput = z.infer<typeof CalendarEventCreateInputSchema>
type CalendarEventCreateOutput = z.infer<typeof CalendarEventCreateOutputSchema>

function shouldEmitCreatedEvent(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false
  }
  return true
}

export const calendarEventCreateRegistry: ToolDefinition<
  CalendarEventCreateInput,
  CalendarEventCreateOutput
> = {
  name: 'calendar_event_create',
  label: 'Create Calendar Event',
  ui: {
    title: 'Created calendar event',
    activeTitle: 'Creating calendar event',
    targetArg: 'summary',
  },
  description:
    'Create a Google Calendar event (recurring when recurrence is set). Pass crm_instance_id so retries reuse one Google id. A row with recurring_event_id + original_start patches that series occurrence instead. Never inserts when google_event_id is set. Set emit_event false when creating from a CRM outbound push so inbound sync does not insert a duplicate row.',
  timeout: 60_000,
  inputSchema: CalendarEventCreateInputSchema,
  outputSchema: CalendarEventCreateOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const record = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not linked`)
      }

      assertCalendarWritable(record)

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const allDay = asBoolean(input.all_day)
      const fields: GoogleCalendarEventInput = {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
        timezone: input.timezone,
        all_day: allDay,
        attendees: input.attendees,
        status: input.status,
        send_updates: input.send_updates,
      }

      const storedId = asGoogleEventId(input.google_event_id)
      let write: CalendarEventCreateOutput['write']
      let googleEvent

      if (!storedId && input.recurring_event_id && input.original_start) {
        // "This event" edit: an exception row. Patch the Google occurrence of
        // its series; never insert a standalone duplicate.
        const resolved = await resolveSeriesInstanceId({
          recurring_event_id: input.recurring_event_id,
          original_start: input.original_start,
          all_day: allDay,
        })
        if (!resolved) {
          return createNotFoundError(
            `Series ${input.recurring_event_id} for this exception no longer exists`,
          )
        }
        googleEvent = await patchSeriesInstance(
          client,
          input.calendar_id,
          resolved.instanceId,
          fields,
        )
        if (!googleEvent) {
          return createNotFoundError(
            `Occurrence ${resolved.instanceId} is no longer in Google Calendar`,
          )
        }
        write = 'instance'
      } else if (storedId) {
        // Already in Google: read it back so the caller can write ids back.
        googleEvent = await getGoogleCalendarEvent(client, input.calendar_id, storedId)
        write = 'existing'
      } else {
        const recurrence = input.recurrence
        const timezone =
          input.timezone ??
          (recurrence && !allDay
            ? record.timezone || RECURRING_EVENT_FALLBACK_TIMEZONE
            : undefined)
        const inserted = await insertEventIdempotent(
          client,
          input.calendar_id,
          { ...fields, timezone, recurrence },
          {
            eventId: input.crm_instance_id
              ? skedyulGoogleEventId(input.crm_instance_id)
              : undefined,
          },
        )
        googleEvent = inserted.event
        write = inserted.created ? 'insert' : 'existing'
      }

      const normalized = normalizeGoogleCalendarEvent(googleEvent)

      if (shouldEmitCreatedEvent(input.emit_event)) {
        await createGoogleEvent(
          'calendar.event.created',
          {
            calendar: {
              calendar_id: input.calendar_id,
              summary: record.summary || input.calendar_id,
            },
            event: normalized,
            sync: {
              direction: record.sync_direction ?? 'both',
              trigger: 'tool',
            },
          },
          { trigger: 'tool' },
        )
      }

      return createSuccessResponse({ event: normalized, write })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
