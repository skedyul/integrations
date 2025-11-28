import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

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
  name: 'calendar_slots.reserve',
  description: 'Reserve a calendar slot',
  inputs: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
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

