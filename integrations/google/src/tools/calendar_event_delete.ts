import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import type { calendar_v3 } from 'googleapis'
import { assertCalendarWritable } from '../lib/calendar_link'
import { blankToUndefined } from '../lib/calendar-event-update-patch'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { isGoogleNotFound } from '../lib/google-errors'
import { createGoogleEvent } from '../lib/create-google-event'
import { getGoogleCalendarEvent } from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import { deleteEventIdempotent } from '../services/calendar/writes'
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const CalendarEventDeleteInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: z.string().min(1),
  send_updates: z.preprocess(
    blankToUndefined,
    z.enum(['all', 'externalOnly', 'none']).optional(),
  ),
  /**
   * Set false on CRM outbound deletes: emitting calendar.event.deleted would
   * let the inbound sync workflow upsert the just-deleted row back as cancelled.
   */
  emit_event: z.preprocess(
    blankToUndefined,
    z.union([z.boolean(), z.string()]).optional(),
  ),
})

const CalendarEventDeleteOutputSchema = z.object({
  calendar_id: z.string(),
  event_id: z.string(),
  deleted: z.boolean(),
  /** The event was already gone in Google (404/410); still a success. */
  already_deleted: z.boolean(),
})

type CalendarEventDeleteInput = z.infer<typeof CalendarEventDeleteInputSchema>
type CalendarEventDeleteOutput = z.infer<typeof CalendarEventDeleteOutputSchema>

function shouldEmit(value: unknown): boolean {
  return !(value === false || value === 'false' || value === 0 || value === '0')
}

export const calendarEventDeleteRegistry: ToolDefinition<
  CalendarEventDeleteInput,
  CalendarEventDeleteOutput
> = {
  name: 'calendar_event_delete',
  label: 'Delete Calendar Event',
  ui: {
    title: 'Deleted calendar event',
    activeTitle: 'Deleting calendar event',
  },
  description:
    'Delete a Google Calendar event. Idempotent: an event that is already gone counts as deleted. Set emit_event false from CRM outbound deletes.',
  timeout: 60_000,
  inputSchema: CalendarEventDeleteInputSchema,
  outputSchema: CalendarEventDeleteOutputSchema,
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
      const emit = shouldEmit(input.emit_event)

      let existing: calendar_v3.Schema$Event | null = null
      if (emit) {
        try {
          existing = await getGoogleCalendarEvent(client, input.calendar_id, input.event_id)
        } catch (error) {
          if (!isGoogleNotFound(error)) throw error
        }
      }

      const { alreadyDeleted } = await deleteEventIdempotent(
        client,
        input.calendar_id,
        input.event_id,
        input.send_updates,
      )

      if (emit && existing && !alreadyDeleted) {
        await createGoogleEvent(
          'calendar.event.deleted',
          {
            calendar: {
              calendar_id: input.calendar_id,
              summary: record.summary || input.calendar_id,
            },
            event: normalizeGoogleCalendarEvent({ ...existing, status: 'cancelled' }),
            sync: {
              direction: record.sync_direction ?? 'both',
              trigger: 'tool',
            },
          },
          { trigger: 'tool' },
        )
      }

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        event_id: input.event_id,
        deleted: true,
        already_deleted: alreadyDeleted,
      })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
