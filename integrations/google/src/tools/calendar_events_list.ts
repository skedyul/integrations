import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { listGoogleCalendarEvents } from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import {
  createAuthError,
  createGoogleError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const CalendarEventsListInputSchema = z.object({
  calendar_id: z.string().min(1),
  time_min: z.string().optional(),
  time_max: z.string().optional(),
  updated_min: z.string().optional(),
  sync_token: z.string().optional(),
  max_results: z.number().int().positive().max(2500).optional(),
})

const CalendarEventsListOutputSchema = z.object({
  events: z.array(
    z.object({
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
  ),
  next_sync_token: z.string().nullable(),
})

type CalendarEventsListInput = z.infer<typeof CalendarEventsListInputSchema>
type CalendarEventsListOutput = z.infer<typeof CalendarEventsListOutputSchema>

export const calendarEventsListRegistry: ToolDefinition<
  CalendarEventsListInput,
  CalendarEventsListOutput
> = {
  name: 'calendar_events_list',
  label: 'List Calendar Events',
  description: 'List Google Calendar events for a calendar',
  inputSchema: CalendarEventsListInputSchema,
  outputSchema: CalendarEventsListOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const page = await listGoogleCalendarEvents(client, {
        calendarId: input.calendar_id,
        syncToken: input.sync_token,
        timeMin: input.time_min,
        timeMax: input.time_max,
        updatedMin: input.updated_min,
        maxResults: input.max_results,
      })

      return createSuccessResponse({
        events: page.events
          .filter((event) => Boolean(event.id))
          .map((event) => normalizeGoogleCalendarEvent(event)),
        next_sync_token: page.nextSyncToken ?? null,
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
