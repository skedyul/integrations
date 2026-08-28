import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import { asBoolean, blankToUndefined } from '../lib/calendar-event-update-patch'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import { createGoogleCalendarEvent } from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
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
  attendees: z.array(z.string().email()).optional(),
  recurrence: z.array(z.string()).optional(),
  google_event_id: optionalString,
  recurring_event_id: optionalString,
  original_start: optionalString,
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
  description: 'Create a Google Calendar event. Set emit_event false when creating from a CRM outbound push so inbound sync does not insert a duplicate row.',
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
      const created = await createGoogleCalendarEvent(client, input.calendar_id, {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
        timezone: input.timezone,
        all_day: asBoolean(input.all_day),
        attendees: input.attendees,
        recurrence: input.recurrence,
        google_event_id: input.google_event_id,
        recurring_event_id: input.recurring_event_id,
        original_start: input.original_start,
      })
      const normalized = normalizeGoogleCalendarEvent(created)

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

      return createSuccessResponse({ event: normalized })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
