import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { queryGoogleFreeBusy } from '../services/calendar/client'
import {
  createAuthError,
  createGoogleError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const CalendarFreeBusyInputSchema = z.object({
  calendar_ids: z.array(z.string().min(1)).min(1),
  time_min: z.string().min(1),
  time_max: z.string().min(1),
  timezone: z.string().optional(),
})

const CalendarFreeBusyOutputSchema = z.object({
  calendars: z.record(
    z.string(),
    z.array(
      z.object({
        start: z.string(),
        end: z.string(),
      }),
    ),
  ),
})

type CalendarFreeBusyInput = z.infer<typeof CalendarFreeBusyInputSchema>
type CalendarFreeBusyOutput = z.infer<typeof CalendarFreeBusyOutputSchema>

export const calendarFreeBusyQueryRegistry: ToolDefinition<
  CalendarFreeBusyInput,
  CalendarFreeBusyOutput
> = {
  name: 'calendar_freebusy_query',
  label: 'Query Calendar Free/Busy',
  description: 'Query busy intervals for one or more Google calendars',
  inputSchema: CalendarFreeBusyInputSchema,
  outputSchema: CalendarFreeBusyOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const calendars = await queryGoogleFreeBusy(client, {
        calendarIds: input.calendar_ids,
        timeMin: input.time_min,
        timeMax: input.time_max,
        timeZone: input.timezone,
      })

      return createSuccessResponse({ calendars })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
