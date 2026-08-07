import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import {
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvent,
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

const CalendarEventDeleteInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: z.string().min(1),
})

const CalendarEventDeleteOutputSchema = z.object({
  calendar_id: z.string(),
  event_id: z.string(),
  deleted: z.boolean(),
})

type CalendarEventDeleteInput = z.infer<typeof CalendarEventDeleteInputSchema>
type CalendarEventDeleteOutput = z.infer<typeof CalendarEventDeleteOutputSchema>

export const calendarEventDeleteRegistry: ToolDefinition<
  CalendarEventDeleteInput,
  CalendarEventDeleteOutput
> = {
  name: 'calendar_event_delete',
  label: 'Delete Calendar Event',
  description: 'Delete a Google Calendar event',
  inputSchema: CalendarEventDeleteInputSchema,
  outputSchema: CalendarEventDeleteOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const record = await loadGoogleCalendarRecord(input.calendar_id)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not linked`)
      }

      assertCalendarWritable(record)

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const existing = await getGoogleCalendarEvent(client, input.calendar_id, input.event_id)
      const normalized = normalizeGoogleCalendarEvent({
        ...existing,
        status: 'cancelled',
      })

      await deleteGoogleCalendarEvent(client, input.calendar_id, input.event_id)

      await createGoogleEvent(
        'calendar.event.deleted',
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

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        event_id: input.event_id,
        deleted: true,
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
