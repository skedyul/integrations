import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

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
  handler: async (_input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.get<Calendar[] | PetbooqzErrorResponse>('/calendars')

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarsListOutput>('calendars_list', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      const calendars = Array.isArray(response) ? response : []

      return createToolResponse('calendars_list', {
        success: true,
        data: { calendars },
        message: `Found ${calendars.length} calendar${calendars.length !== 1 ? 's' : ''}`,
      })
    } catch (error) {
      return createToolResponse<CalendarsListOutput>('calendars_list', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list calendars',
      })
    }
  },
}
