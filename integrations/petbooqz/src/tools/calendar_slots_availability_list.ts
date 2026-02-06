import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

const AvailableSlotSchema = z.object({
  calendar: z.string(),
  date: z.string(),
  slots: z.array(z.string()),
})

const CalendarSlotsAvailabilityListInputSchema = z.object({
  calendars: z.array(z.string()).min(1),
  dates: z.array(z.string()).min(1),
})

const CalendarSlotsAvailabilityListOutputSchema = z.object({
  availableSlots: z.array(AvailableSlotSchema),
})

type CalendarSlotsAvailabilityListInput = z.infer<typeof CalendarSlotsAvailabilityListInputSchema>
type CalendarSlotsAvailabilityListOutput = z.infer<typeof CalendarSlotsAvailabilityListOutputSchema>

export const calendarSlotsAvailabilityListRegistry: ToolDefinition<
  CalendarSlotsAvailabilityListInput,
  CalendarSlotsAvailabilityListOutput
> = {
  name: 'calendar_slots_availability_list',
  label: 'List Available Calendar Slots',
  description: 'List available calendar slots for given calendars and dates on the Petbooqz calendar',
  inputSchema: CalendarSlotsAvailabilityListInputSchema,
  outputSchema: CalendarSlotsAvailabilityListOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.post<AvailableSlot[] | PetbooqzErrorResponse>('/slots', {
        calendars: input.calendars,
        dates: input.dates,
      })

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsAvailabilityListOutput>('calendar_slots_availability_list', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      const availableSlots = Array.isArray(response) ? response : []
      const totalSlots = availableSlots.reduce((sum, s) => sum + s.slots.length, 0)

      return createToolResponse('calendar_slots_availability_list', {
        success: true,
        data: { availableSlots },
        message: `Found ${totalSlots} available slot${totalSlots !== 1 ? 's' : ''} across ${availableSlots.length} calendar${availableSlots.length !== 1 ? 's' : ''}`,
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsAvailabilityListOutput>('calendar_slots_availability_list', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list available slots',
      })
    }
  },
}
