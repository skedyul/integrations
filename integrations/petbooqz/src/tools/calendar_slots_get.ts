import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface Slot {
  slot_id: string
  datetime: string
  duration: number
  client_id: string | null
  patient_id: string | null
  email_address: string | null
  phone_number: string | null
  status: string | null
  calendar: string
}

const SlotSchema = z.object({
    slot_id: z.string(),
    datetime: z.string(),
    duration: z.number(),
    client_id: z.string().nullable(),
    patient_id: z.string().nullable(),
    email_address: z.string().nullable(),
    phone_number: z.string().nullable(),
    status: z.string().nullable(),
    calendar: z.string(),
})

const CalendarSlotsGetInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsGetOutputSchema = z.object({
  slot: SlotSchema,
})

type CalendarSlotsGetInput = z.infer<typeof CalendarSlotsGetInputSchema>
type CalendarSlotsGetOutput = z.infer<typeof CalendarSlotsGetOutputSchema>

export const calendarSlotsGetRegistry: ToolDefinition<
  CalendarSlotsGetInput,
  CalendarSlotsGetOutput
> = {
  name: 'calendar_slots_get',
  label: 'Get Calendar Slot',
  description: 'Get calendar slot details on the Petbooqz calendar',
  inputSchema: CalendarSlotsGetInputSchema,
  outputSchema: CalendarSlotsGetOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.get<Slot | PetbooqzErrorResponse>(
      `/calendars/${input.calendar_id}/check`,
      { slot_id: input.slot_id },
    )

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsGetOutput>('calendar_slots_get', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      return createToolResponse('calendar_slots_get', {
        success: true,
        data: { slot: response },
        message: `Slot ${response.slot_id} retrieved`,
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsGetOutput>('calendar_slots_get', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get slot',
      })
    }
  },
}
