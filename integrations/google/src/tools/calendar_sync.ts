import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import {
  StartAppBatchOperationError,
  startAppBatchOperation,
} from '../lib/start-app-batch-operation'
import {
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
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
  enable_live_sync: z.boolean().optional().default(false),
})

const CalendarSyncOutputSchema = z.object({
  batch_job_id: z.string(),
  operation_handle: z.string(),
  calendars: z.number().int().nonnegative(),
  live_sync_enabled: z.boolean(),
})

type CalendarSyncInput = z.infer<typeof CalendarSyncInputSchema>
type CalendarSyncOutput = z.infer<typeof CalendarSyncOutputSchema>

export const calendarSyncRegistry: ToolDefinition<
  CalendarSyncInput,
  CalendarSyncOutput
> = {
  name: 'calendar_sync',
  label: 'Sync Google Calendar',
  description:
    'Start one calendar-event import batch for a linked calendar or all enabled calendars. Does not emit per-event webhooks.',
  inputSchema: CalendarSyncInputSchema,
  outputSchema: CalendarSyncOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const targets = input.calendar_id
        ? [await loadGoogleCalendarRecord(input.calendar_id)]
        : await loadLinkedGoogleCalendars()

      const records = targets.filter(
        (record): record is NonNullable<typeof record> => Boolean(record),
      )
      const enabled = records.filter((record) => record.sync_enabled)

      if (enabled.length === 0) {
        return createNotFoundError('No linked calendars were found to sync')
      }

      if (input.enable_live_sync) {
        const { client } = await getAuthenticatedOAuthClient(context.env)
        for (const record of enabled) {
          await ensureCalendarWatch(client, record)
        }
      }

      const started = await startAppBatchOperation({
        operationHandle: 'import_calendar_events',
        entityHandle: 'calendar_event',
        label: input.calendar_id
          ? `Sync calendar ${input.calendar_id}`
          : 'Sync Google Calendar events',
        input: {
          ...(input.calendar_id ? { calendar_id: input.calendar_id } : {}),
          ...(input.time_min ? { time_min: input.time_min } : {}),
          ...(input.time_max ? { time_max: input.time_max } : {}),
          use_sync_token: true,
        },
      })

      return createSuccessResponse({
        batch_job_id: started.batchJobId,
        operation_handle: 'import_calendar_events',
        calendars: enabled.length,
        live_sync_enabled: Boolean(input.enable_live_sync),
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      if (error instanceof StartAppBatchOperationError) {
        if (error.code === 'PRECONDITION_FAILED') {
          return createValidationError(error.message)
        }
        if (error.code === 'CONFLICT') {
          return createValidationError(error.message)
        }
        return createGoogleError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
