import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

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
  name: 'calendar_slots.release',
  description: 'Release a calendar slot',
  inputs: CalendarSlotsReleaseInputSchema,
  outputSchema: CalendarSlotsReleaseOutputSchema,
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

