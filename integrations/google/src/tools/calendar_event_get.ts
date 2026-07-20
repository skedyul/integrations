import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { getGoogleCalendarEvent } from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import {
  createAuthError,
  createGoogleError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const CalendarEventGetInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: z.string().min(1),
})

const CalendarEventGetOutputSchema = z.object({
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

type CalendarEventGetInput = z.infer<typeof CalendarEventGetInputSchema>
type CalendarEventGetOutput = z.infer<typeof CalendarEventGetOutputSchema>

export const calendarEventGetRegistry: ToolDefinition<
  CalendarEventGetInput,
  CalendarEventGetOutput
> = {
  name: 'calendar_event_get',
  label: 'Get Calendar Event',
  description: 'Get a single Google Calendar event',
  inputSchema: CalendarEventGetInputSchema,
  outputSchema: CalendarEventGetOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const event = await getGoogleCalendarEvent(client, input.calendar_id, input.event_id)
      return createSuccessResponse({
        event: normalizeGoogleCalendarEvent(event),
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
