import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import {
  attendeeEmails,
  buildCalendarEventUpdatePatch,
  parseJsonRecord,
} from '../lib/calendar-event-update-patch'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import {
  getGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type GoogleCalendarEventInput,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const AttendeeSchema = z.union([
  z.string(),
  z.object({ email: z.string() }),
])

const JsonRecordSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string(),
])

const CalendarEventUpdateInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  timezone: z.string().optional(),
  all_day: z.boolean().optional(),
  attendees: z.array(AttendeeSchema).optional(),
  recurrence: z.array(z.string()).optional(),
  status: z.string().optional(),
  /** Unformatted calendar_event payload from `| google: "unformat"` */
  before: JsonRecordSchema.optional(),
  after: JsonRecordSchema.optional(),
})

const CalendarEventUpdateOutputSchema = z.object({
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

type CalendarEventUpdateInput = z.infer<typeof CalendarEventUpdateInputSchema>
type CalendarEventUpdateOutput = z.infer<typeof CalendarEventUpdateOutputSchema>

function resolveUpdateInput(
  input: CalendarEventUpdateInput,
): (GoogleCalendarEventInput & { calendar_id: string; event_id: string }) | null {
  if (input.after != null && input.after !== '') {
    const after = parseJsonRecord(input.after)
    if (!after) {
      return null
    }
    return buildCalendarEventUpdatePatch(parseJsonRecord(input.before), after)
  }

  return {
    calendar_id: input.calendar_id,
    event_id: input.event_id,
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: input.start,
    end: input.end,
    timezone: input.timezone,
    all_day: input.all_day,
    attendees: attendeeEmails(input.attendees),
    recurrence: input.recurrence,
    status: input.status,
  }
}

export const calendarEventUpdateRegistry: ToolDefinition<
  CalendarEventUpdateInput,
  CalendarEventUpdateOutput
> = {
  name: 'calendar_event_update',
  label: 'Update Calendar Event',
  description:
    'Update a Google Calendar event. Pass mapped fields directly, or unformatted CRM before/after payloads from the install map.',
  inputSchema: CalendarEventUpdateInputSchema,
  outputSchema: CalendarEventUpdateOutputSchema,
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
      const patch = resolveUpdateInput(input)
      const updated = patch
        ? await updateGoogleCalendarEvent(
            client,
            patch.calendar_id,
            patch.event_id,
            patch,
          )
        : await getGoogleCalendarEvent(client, input.calendar_id, input.event_id)
      const normalized = normalizeGoogleCalendarEvent(updated)

      if (patch) {
        await createGoogleEvent(
          'calendar.event.updated',
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
