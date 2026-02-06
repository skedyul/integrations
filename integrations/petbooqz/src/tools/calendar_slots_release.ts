import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

const CalendarSlotsReleaseInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsReleaseOutputSchema = z.object({})

type CalendarSlotsReleaseInput = z.infer<typeof CalendarSlotsReleaseInputSchema>
type CalendarSlotsReleaseOutput = z.infer<typeof CalendarSlotsReleaseOutputSchema>

export const calendarSlotsReleaseRegistry: ToolDefinition<
  CalendarSlotsReleaseInput,
  CalendarSlotsReleaseOutput
> = {
  name: 'calendar_slots_release',
  label: 'Release Calendar Slot',
  description: 'Release a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsReleaseInputSchema,
  outputSchema: CalendarSlotsReleaseOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const slotCheck = await client.get<unknown | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/check`,
        { slot_id: input.slot_id },
      )

      if (isPetbooqzError(slotCheck)) {
        return createToolResponse<CalendarSlotsReleaseOutput>('calendar_slots_release', {
          success: false,
          error: getErrorMessage(slotCheck),
        })
      }

      const response = await client.delete<unknown | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/release`,
        { slot_id: input.slot_id },
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsReleaseOutput>('calendar_slots_release', {
          success: false,
          error: getErrorMessage(response as PetbooqzErrorResponse),
        })
      }

      return createToolResponse('calendar_slots_release', {
        success: true,
        data: {},
        message: 'Slot released',
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsReleaseOutput>('calendar_slots_release', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to release slot',
      })
    }
  },
}
