import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface ReserveSlotResponse {
  slot_id: number
}

const CalendarSlotsReserveInputSchema = z.object({
  calendar_id: z.string(),
  datetime: z.string(),
  duration: z.string(),
  appointment_note: z.string().optional(),
})

const CalendarSlotsReserveOutputSchema = z.object({
  slot_id: z.number(),
})

type CalendarSlotsReserveInput = z.infer<typeof CalendarSlotsReserveInputSchema>
type CalendarSlotsReserveOutput = z.infer<typeof CalendarSlotsReserveOutputSchema>

export const calendarSlotsReserveRegistry: ToolDefinition<
  CalendarSlotsReserveInput,
  CalendarSlotsReserveOutput
> = {
  name: 'calendar_slots_reserve',
  description: 'Reserve a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    const response = await client.post<ReserveSlotResponse[]>(
      `/calendars/${input.calendar_id}/reserve`,
      {
        datetime: input.datetime,
        duration: input.duration,
        appointment_note: input.appointment_note,
      },
    )

    // API returns array with single object
    const slotId = response[0]?.slot_id
    if (!slotId) {
      throw new Error('Failed to reserve slot: no slot_id returned')
    }

    return {
      output: {
        slot_id: slotId,
      },
      billing: {
        credits: 0,
      },
    }
  },
}
