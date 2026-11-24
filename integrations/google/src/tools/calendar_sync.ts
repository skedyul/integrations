import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
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
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
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
  /** `queued` when it runs after an import already in progress */
  status: z.enum(['started', 'queued']),
  calendars: z.number().int().nonnegative(),
  live_sync_enabled: z.boolean(),
})

type CalendarSyncInput = z.infer<typeof CalendarSyncInputSchema>
type CalendarSyncOutput = z.infer<typeof CalendarSyncOutputSchema>

const OPERATION_HANDLE = 'import_calendar_events'

export const calendarSyncRegistry: ToolDefinition<
  CalendarSyncInput,
  CalendarSyncOutput
> = {
  name: 'calendar_sync',
  label: 'Sync Google Calendar',
  ui: { title: 'Synced calendar', activeTitle: 'Syncing calendar' },
  description:
    'Start one incremental calendar-event import batch (stored sync tokens) for a Google calendar or every sync-enabled calendar, queued behind an import already running. With enable_live_sync, opens push channels (the platform renews them). Does not emit per-event webhooks.',
  timeout: 60_000,
  inputSchema: CalendarSyncInputSchema,
  outputSchema: CalendarSyncOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const targets = input.calendar_id
        ? [await loadGoogleCalendarRecord(input.calendar_id, context.env)]
        : await loadLinkedGoogleCalendars(context.env)

      const records = targets.filter(
        (record): record is NonNullable<typeof record> => Boolean(record),
      )

      if (records.length === 0) {
        return createNotFoundError('No Google calendars were found to sync')
      }

      if (input.enable_live_sync) {
        const { client } = await getAuthenticatedOAuthClient(context.env)
        for (const record of records) {
          await ensureCalendarWatch(client, record)
        }
      }

      const started = await startAppBatchOperation({
        operationHandle: OPERATION_HANDLE,
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
        ifRunning: 'queue',
      })

      return createSuccessResponse({
        batch_job_id: started.batchJobId,
        operation_handle: OPERATION_HANDLE,
        status: started.status,
        calendars: records.length,
        live_sync_enabled: Boolean(input.enable_live_sync),
      })
    } catch (error) {
      if (error instanceof StartAppBatchOperationError) {
        if (error.code === 'PRECONDITION_FAILED' || error.code === 'CONFLICT') {
          return createValidationError(error.message)
        }
        return createGoogleError(error.message)
      }
      return googleToolFailure(error)
    }
  },
}
