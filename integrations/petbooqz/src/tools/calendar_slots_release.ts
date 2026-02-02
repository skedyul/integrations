import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

const CalendarSlotsReleaseInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsReleaseOutputSchema = z.object({
  success: z.boolean(),
})

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
    await client.delete(
      `/calendars/${input.calendar_id}/release`,
      { slot_id: input.slot_id },
    )

    return {
      output: {
        success: true,
      },
      billing: {
        credits: 0,
      },
    }
  },
}
