import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

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

const CalenderSlotsGetInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalenderSlotsGetOutputSchema = z.object({
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

type CalenderSlotsGetInput = z.infer<typeof CalenderSlotsGetInputSchema>
type CalenderSlotsGetOutput = z.infer<typeof CalenderSlotsGetOutputSchema>

export const calenderSlotsGetRegistry: ToolDefinition<
  CalenderSlotsGetInput,
  CalenderSlotsGetOutput
> = {
  name: 'calender_slots.get',
  description: 'Get calendar slot details on the Petbooqz calendar',
  inputs: CalenderSlotsGetInputSchema,
  outputSchema: CalenderSlotsGetOutputSchema,
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

