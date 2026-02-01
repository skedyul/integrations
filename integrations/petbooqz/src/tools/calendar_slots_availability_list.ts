import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

const CalendarSlotsAvailabilityListInputSchema = z.object({
  calendars: z.array(z.string()).min(1),
  dates: z.array(z.string()).min(1),
})

const CalendarSlotsAvailabilityListOutputSchema = z.object({
  availableSlots: z.array(
    z.object({
      calendar: z.string(),
      date: z.string(),
      slots: z.array(z.string()),
    }),
  ),
})

type CalendarSlotsAvailabilityListInput = z.infer<
  typeof CalendarSlotsAvailabilityListInputSchema
>
type CalendarSlotsAvailabilityListOutput = z.infer<
  typeof CalendarSlotsAvailabilityListOutputSchema
>

export const calendarSlotsAvailabilityListRegistry: ToolDefinition<
  CalendarSlotsAvailabilityListInput,
  CalendarSlotsAvailabilityListOutput
> = {
  name: 'calendar_slots_availability_list',
  description: 'List available calendar slots for given calendars and dates on the Petbooqz calendar',
  inputSchema: CalendarSlotsAvailabilityListInputSchema,
  outputSchema: CalendarSlotsAvailabilityListOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    const availableSlots = await client.post<AvailableSlot[]>('/slots', {
      calendars: input.calendars,
      dates: input.dates,
    })

    return {
      output: {
        availableSlots,
      },
      billing: {
        credits: 0,
      },
    }
  },
}
