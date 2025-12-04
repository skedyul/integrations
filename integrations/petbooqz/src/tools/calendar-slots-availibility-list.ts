import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

export interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

const CalendarSlotsAvailibilityListInputSchema = z.object({
  calendars: z.array(z.string()).min(1),
  dates: z.array(z.string()).min(1),
})

const CalendarSlotsAvailibilityListOutputSchema = z.object({
  availableSlots: z.array(
    z.object({
      calendar: z.string(),
      date: z.string(),
      slots: z.array(z.string()),
    }),
  ),
})

type CalendarSlotsAvailibilityListInput = z.infer<
  typeof CalendarSlotsAvailibilityListInputSchema
>
type CalendarSlotsAvailibilityListOutput = z.infer<
  typeof CalendarSlotsAvailibilityListOutputSchema
>

export const calendarSlotsAvailibilityListRegistry: ToolDefinition<
  CalendarSlotsAvailibilityListInput,
  CalendarSlotsAvailibilityListOutput
> = {
  name: 'calendar_slots.availibility.list',
  description: 'List available calendar slots for given calendars and dates on the Petbooqz calendar',
  inputs: CalendarSlotsAvailibilityListInputSchema,
  outputSchema: CalendarSlotsAvailibilityListOutputSchema,
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

