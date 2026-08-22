import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import { updateGoogleCalendarEvent } from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'
import {
  buildGoogleEventExtendedProperties,
  shouldEmitGoogleAppEvent,
} from '../lib/calendar_event_sync'

const CalendarEventUpdateInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  timezone: z.string().optional(),
  all_day: z
    .union([
      z.boolean(),
      z.enum(['true', 'false']).transform((value) => value === 'true'),
    ])
    .optional(),
  attendees: z.array(z.string().email()).optional(),
  recurrence: z
    .union([
      z.array(z.string()),
      z.object({ lines: z.array(z.string()) }).transform((value) => value.lines),
    ])
    .optional(),
  emit_app_event: z.boolean().optional(),
  sync_origin: z.enum(['skedyul', 'google']).optional(),
  skedyul_instance_id: z.string().optional(),
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

export const calendarEventUpdateRegistry: ToolDefinition<
  CalendarEventUpdateInput,
  CalendarEventUpdateOutput
> = {
  name: 'calendar_event_update',
  label: 'Update Calendar Event',
  description: 'Update a Google Calendar event',
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
      const updated = await updateGoogleCalendarEvent(
        client,
        input.calendar_id,
        input.event_id,
        {
          ...input,
          extendedProperties: buildGoogleEventExtendedProperties(input),
        },
      )
      const normalized = normalizeGoogleCalendarEvent(updated)

      if (shouldEmitGoogleAppEvent(input)) {
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
