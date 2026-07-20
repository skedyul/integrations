import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { removeCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
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
  description: 'Unlink a Google Calendar and stop push notifications',
  inputSchema: RemoveGoogleCalendarInputSchema,
  outputSchema: RemoveGoogleCalendarOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const record = await loadGoogleCalendarRecord(input.calendar_id)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not linked`)
      }

      const { client } = await getAuthenticatedOAuthClient(context.env)
      await removeCalendarWatch(client, record)

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        removed: true,
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
