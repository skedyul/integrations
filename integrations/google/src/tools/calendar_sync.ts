import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import {
  StartAppBatchOperationError,
  startAppBatchOperation,
} from '../lib/start-app-batch-operation'
import { ensureSyncSchedulesOnce } from '../lib/sync-schedules'
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
  /** Null when no batch was started (scheduled run with nothing to do, or one already running). */
  batch_job_id: z.string().nullable(),
  operation_handle: z.string(),
  status: z.enum(['started', 'already_running', 'nothing_to_sync']),
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
    'Start one incremental calendar-event import batch (stored sync tokens) for a Google calendar or every sync-enabled calendar. Also runs every 15 minutes from a cron schedule as a catch-up behind live push. Does not emit per-event webhooks.',
  timeout: 60_000,
  inputSchema: CalendarSyncInputSchema,
  outputSchema: CalendarSyncOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const scheduled = context.trigger === 'cron'
    const nothingToDo = (status: CalendarSyncOutput['status'], calendars = 0) =>
      createSuccessResponse({
        batch_job_id: null,
        operation_handle: OPERATION_HANDLE,
        status,
        calendars,
        live_sync_enabled: false,
      })

    try {
      if (!scheduled) {
        await ensureSyncSchedulesOnce(context.appInstallationId)
      }

      const targets = input.calendar_id
        ? [await loadGoogleCalendarRecord(input.calendar_id, context.env)]
        : await loadLinkedGoogleCalendars(context.env, { crmOnly: scheduled })

      const records = targets.filter(
        (record): record is NonNullable<typeof record> => Boolean(record),
      )

      if (records.length === 0) {
        return scheduled
          ? nothingToDo('nothing_to_sync')
          : createNotFoundError('No Google calendars were found to sync')
      }

      if (input.enable_live_sync && !scheduled) {
        const { client } = await getAuthenticatedOAuthClient(context.env)
        for (const record of records) {
          await ensureCalendarWatch(client, record)
        }
      }

      let started
      try {
        started = await startAppBatchOperation({
          operationHandle: OPERATION_HANDLE,
          entityHandle: 'calendar_event',
          label: input.calendar_id
            ? `Sync calendar ${input.calendar_id}`
            : scheduled
              ? 'Scheduled Google Calendar catch-up sync'
              : 'Sync Google Calendar events',
          input: {
            ...(input.calendar_id ? { calendar_id: input.calendar_id } : {}),
            ...(input.time_min ? { time_min: input.time_min } : {}),
            ...(input.time_max ? { time_max: input.time_max } : {}),
            use_sync_token: true,
          },
        })
      } catch (error) {
        // A sync already running covers this scheduled run; maps not set up
        // yet is not a failure of the schedule.
        if (
          scheduled &&
          error instanceof StartAppBatchOperationError &&
          (error.code === 'CONFLICT' || error.code === 'PRECONDITION_FAILED')
        ) {
          return nothingToDo(
            error.code === 'CONFLICT' ? 'already_running' : 'nothing_to_sync',
            records.length,
          )
        }
        throw error
      }

      return createSuccessResponse({
        batch_job_id: started.batchJobId,
        operation_handle: OPERATION_HANDLE,
        status: 'started' as const,
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
