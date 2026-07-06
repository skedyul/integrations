import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

export interface Calendar {
  column: string | null
  name: string
}

const CalendarSchema = z.object({
  column: z.string().nullable(),
  name: z.string(),
})

const CalendarsListInputSchema = z.object({})

const CalendarsListOutputSchema = z.object({
  calendars: z.array(CalendarSchema),
})

type CalendarsListInput = z.infer<typeof CalendarsListInputSchema>
type CalendarsListOutput = z.infer<typeof CalendarsListOutputSchema>

export const calendarsListRegistry: ToolDefinition<
  CalendarsListInput,
  CalendarsListOutput
> = {
  name: 'calendars_list',
  label: 'List Calendars',
  description: 'List all calendars on Petbooqz',
  inputSchema: CalendarsListInputSchema,
  outputSchema: CalendarsListOutputSchema,
  timeout: 300000,
  queueTouchPoints: PETBOOQZ_API_ONE,
  handler: async (_input, context) => {
    
      const client = createClientFromEnv(context.env)

      try {
        const response = await client.get<Calendar[] | PetbooqzErrorResponse>('/calendars')

        if (isPetbooqzError(response)) {
          return createExternalError('Petbooqz', getErrorMessage(response))
        }

        const calendars = Array.isArray(response) ? response : []

        return createSuccessResponse({ calendars })
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to list calendars',
        )
      }
  },
}
