import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api-client'

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

const CalendarSlotsGetInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsGetOutputSchema = z.object({
  slot: z.object({
    slot_id: z.string(),
    datetime: z.string(),
    duration: z.number(),
    client_id: z.string().nullable(),
    patient_id: z.string().nullable(),
    email_address: z.string().nullable(),
    phone_number: z.string().nullable(),
    status: z.string().nullable(),
    calendar: z.string(),
  }),
})

type CalendarSlotsGetInput = z.infer<typeof CalendarSlotsGetInputSchema>
type CalendarSlotsGetOutput = z.infer<typeof CalendarSlotsGetOutputSchema>

export const calendarSlotsGetRegistry: ToolDefinition<
  CalendarSlotsGetInput,
  CalendarSlotsGetOutput
> = {
  name: 'calendar_slots_get',
  description: 'Get calendar slot details on the Petbooqz calendar',
  inputs: CalendarSlotsGetInputSchema,
  outputSchema: CalendarSlotsGetOutputSchema,
  handler: async ({ input, context }) => {
  const client = createClientFromEnv(context.env)
  const slot = await client.get<Slot>(
    `/calendars/${input.calendar_id}/check`,
    { slot_id: input.slot_id },
  )

  return {
    output: {
      slot,
    },
    billing: {
      credits: 0,
    },
  }
  },
}

