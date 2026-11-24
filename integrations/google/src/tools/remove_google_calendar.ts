import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { removeCalendarWatch } from '../lib/calendar_link'
import { updateCrmCalendarSyncState } from '../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { emitGoogleEvent } from '../lib/emit-google-event'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const RemoveGoogleCalendarInputSchema = z.object({
  calendar_id: z.string().min(1),
})

const RemoveGoogleCalendarOutputSchema = z.object({
  calendar_id: z.string(),
  removed: z.boolean(),
})

type RemoveGoogleCalendarInput = z.infer<typeof RemoveGoogleCalendarInputSchema>
type RemoveGoogleCalendarOutput = z.infer<typeof RemoveGoogleCalendarOutputSchema>

export const removeGoogleCalendarRegistry: ToolDefinition<
  RemoveGoogleCalendarInput,
  RemoveGoogleCalendarOutput
> = {
  name: 'remove_google_calendar',
  label: 'Remove Google Calendar',
  ui: { title: 'Removed calendar', activeTitle: 'Removing calendar' },
  description:
    'Stop the Google push channel for a calendar, clear its watch state and turn its sync off on the CRM calendar row, and emit calendar.deleted so CRM workflows can update the mapped row',
  timeout: 60_000,
  inputSchema: RemoveGoogleCalendarInputSchema,
  outputSchema: RemoveGoogleCalendarOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const record = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not available`)
      }

      const { client } = await getAuthenticatedOAuthClient(context.env)
      await removeCalendarWatch(client, record)
      if (record.crm_instance_id) {
        await updateCrmCalendarSyncState(record, { sync_enabled: false })
      }

      await emitGoogleEvent(
        context.appInstallationId,
        'calendar.deleted',
        {
          calendar: {
            calendar_id: input.calendar_id,
            summary: record.summary || input.calendar_id,
            primary: Boolean(record.primary),
            timezone: record.timezone ?? null,
            description: record.description ?? null,
          },
          sync: { trigger: 'tool' },
        },
        `tool:${input.calendar_id}`,
        'tool',
      )

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        removed: true,
      })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
