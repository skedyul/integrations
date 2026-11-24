import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { reconcileCalendarWatches } from '../lib/calendar_link'
import { listCrmCalendarRecords } from '../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import {
  createGoogleError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const CalendarWatchRenewInputSchema = z.object({}).passthrough()

const CalendarWatchRenewOutputSchema = z.object({
  calendars: z.number().int().nonnegative(),
  created: z.array(z.string()),
  renewed: z.array(z.string()),
  stopped: z.array(z.string()),
  unchanged: z.array(z.string()),
  unsupported: z.array(z.string()),
  failed: z.array(z.object({ calendar_id: z.string(), error: z.string() })),
})

type CalendarWatchRenewInput = z.infer<typeof CalendarWatchRenewInputSchema>
type CalendarWatchRenewOutput = z.infer<typeof CalendarWatchRenewOutputSchema>

const EMPTY: CalendarWatchRenewOutput = {
  calendars: 0,
  created: [],
  renewed: [],
  stopped: [],
  unchanged: [],
  unsupported: [],
  failed: [],
}

export const calendarWatchRenewRegistry: ToolDefinition<
  CalendarWatchRenewInput,
  CalendarWatchRenewOutput
> = {
  name: 'calendar_watch_renew',
  label: 'Renew Google Calendar Push',
  ui: { title: 'Renewed calendar push', activeTitle: 'Renewing calendar push' },
  description:
    'Renew Google push channels that expire within 24 hours, open channels for sync-enabled calendars that have none, and stop channels for calendars whose sync is off. Runs every 6 hours from a cron schedule.',
  timeout: 120_000,
  inputSchema: CalendarWatchRenewInputSchema,
  outputSchema: CalendarWatchRenewOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      let records
      try {
        records = await listCrmCalendarRecords()
      } catch (error) {
        // No calendar map yet: nothing to watch.
        console.info(
          `[Google] calendar_watch_renew skipped: ${error instanceof Error ? error.message : String(error)}`,
        )
        return createSuccessResponse(EMPTY)
      }
      if (records.length === 0) {
        return createSuccessResponse(EMPTY)
      }

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const summary = await reconcileCalendarWatches(client, records)
      const attempted =
        summary.created.length +
        summary.renewed.length +
        summary.stopped.length +
        summary.failed.length

      // Report a failed run only when every attempted channel change failed.
      if (summary.failed.length > 0 && summary.failed.length === attempted) {
        const first = summary.failed[0]
        return createGoogleError(
          `Could not renew push for ${summary.failed.length} calendar(s): ${first?.calendar_id}: ${first?.error}`,
        )
      }

      return createSuccessResponse({ calendars: records.length, ...summary })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
