import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { listGoogleCalendars } from '../services/calendar/client'
import {
  googleAuthToolFailure,
  createGoogleError,
  createSuccessResponse,
  createValidationError,
} from '../lib/response'

const CalendarsListInputSchema = z.object({})

const CalendarsListOutputSchema = z.object({
  calendars: z.array(
    z.object({
      calendar_id: z.string(),
      summary: z.string(),
      primary: z.boolean(),
      access_role: z.string().nullable(),
      time_zone: z.string().nullable(),
      description: z.string().nullable(),
    }),
  ),
})

type CalendarsListInput = z.infer<typeof CalendarsListInputSchema>
type CalendarsListOutput = z.infer<typeof CalendarsListOutputSchema>

export const calendarsListRegistry: ToolDefinition<CalendarsListInput, CalendarsListOutput> = {
  name: 'calendars_list',
  label: 'List Google Calendars',
  description: 'List Google calendars available to the connected account',
  inputSchema: CalendarsListInputSchema,
  outputSchema: CalendarsListOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const calendars = await listGoogleCalendars(client)
      return createSuccessResponse({ calendars })
    } catch (error) {
      const authFailure = googleAuthToolFailure(error)
      if (authFailure) return authFailure
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
