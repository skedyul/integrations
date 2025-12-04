import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

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
  const baseUrl = context.env.PETBOOQZ_BASE_URL
  const username = context.env.PETBOOQZ_USERNAME
  const password = context.env.PETBOOQZ_PASSWORD

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  const client = new PetbooqzApiClient({ baseUrl, username, password })
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

