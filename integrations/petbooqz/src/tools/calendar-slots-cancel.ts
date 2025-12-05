import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api-client'

const CalendarSlotsCancelInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsCancelOutputSchema = z.object({
  success: z.boolean(),
})

type CalendarSlotsCancelInput = z.infer<typeof CalendarSlotsCancelInputSchema>
type CalendarSlotsCancelOutput = z.infer<typeof CalendarSlotsCancelOutputSchema>

export const calendarSlotsCancelRegistry: ToolDefinition<
  CalendarSlotsCancelInput,
  CalendarSlotsCancelOutput
> = {
  name: 'calendar_slots.cancel',
  description: 'Cancel a calendar slot on the Petbooqz calendar',
  inputs: CalendarSlotsCancelInputSchema,
  outputSchema: CalendarSlotsCancelOutputSchema,
  handler: async ({ input, context }) => {
  const client = createClientFromEnv(context.env)
  await client.delete(`/calendars/${input.calendar_id}/cancel`, {
    slot_id: input.slot_id,
  })

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

