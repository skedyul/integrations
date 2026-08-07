import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import {
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
  syncGoogleCalendar,
} from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const CalendarSyncInputSchema = z.object({
  calendar_id: z.string().optional(),
  time_min: z.string().optional(),
  time_max: z.string().optional(),
})

const CalendarSyncOutputSchema = z.object({
  calendars_synced: z.number().int().nonnegative(),
  events_created: z.number().int().nonnegative(),
  events_updated: z.number().int().nonnegative(),
  events_deleted: z.number().int().nonnegative(),
})

type CalendarSyncInput = z.infer<typeof CalendarSyncInputSchema>
type CalendarSyncOutput = z.infer<typeof CalendarSyncOutputSchema>

export const calendarSyncRegistry: ToolDefinition<
  CalendarSyncInput,
  CalendarSyncOutput
> = {
  name: 'calendar_sync',
  label: 'Sync Google Calendar',
  description: 'Run an incremental sync for one linked calendar or all enabled calendars',
  inputSchema: CalendarSyncInputSchema,
  outputSchema: CalendarSyncOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const targets = input.calendar_id
        ? [await loadGoogleCalendarRecord(input.calendar_id)]
        : await loadLinkedGoogleCalendars()

      const records = targets.filter(
        (record): record is NonNullable<typeof record> => Boolean(record),
      )

      if (records.length === 0) {
        return createNotFoundError('No linked calendars were found to sync')
      }

      let eventsCreated = 0
      let eventsUpdated = 0
      let eventsDeleted = 0

      for (const record of records) {
        if (!record.sync_enabled) {
          continue
        }

        const watched = await ensureCalendarWatch(client, record)
        const result = await syncGoogleCalendar({
          auth: client,
          appInstallationId: context.appInstallationId,
          calendarRecord: watched,
          trigger: 'manual',
          timeMin: input.time_min,
          timeMax: input.time_max,
        })

        eventsCreated += result.eventsCreated
        eventsUpdated += result.eventsUpdated
        eventsDeleted += result.eventsDeleted
      }

      return createSuccessResponse({
        calendars_synced: records.filter((record) => record.sync_enabled).length,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        events_deleted: eventsDeleted,
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
