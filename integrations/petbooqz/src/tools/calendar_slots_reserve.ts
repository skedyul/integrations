import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface ReserveSlotResponse {
  slot_id: string
}

const CalendarSlotsReserveInputSchema = z.object({
  calendar_id: z.string(),
  datetime: z.string(),
  duration: z.string(),
  appointment_note: z.string().optional(),
})

const CalendarSlotsReserveOutputSchema = z.object({
  slot_id: z.string(),
})

type CalendarSlotsReserveInput = z.infer<typeof CalendarSlotsReserveInputSchema>
type CalendarSlotsReserveOutput = z.infer<typeof CalendarSlotsReserveOutputSchema>

export const calendarSlotsReserveRegistry: ToolDefinition<
  CalendarSlotsReserveInput,
  CalendarSlotsReserveOutput
> = {
  name: 'calendar_slots_reserve',
  label: 'Reserve Calendar Slot',
  description: 'Reserve a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.post<ReserveSlotResponse[] | ReserveSlotResponse | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/reserve`,
        {
          datetime: input.datetime,
          duration: input.duration,
          appointment_note: input.appointment_note,
        },
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsReserveOutput>('calendar_slots_reserve', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      // API returns array with single object or single object
      const slotId = Array.isArray(response) ? response[0]?.slot_id : response.slot_id
      
      if (!slotId) {
        return createToolResponse<CalendarSlotsReserveOutput>('calendar_slots_reserve', {
          success: false,
          error: 'No slot_id returned from API',
        })
      }

      return createToolResponse('calendar_slots_reserve', {
        success: true,
        data: { slot_id: slotId },
        message: `Slot ${slotId} reserved`,
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsReserveOutput>('calendar_slots_reserve', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reserve slot',
      })
    }
  },
}
