import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface ConfirmSlotResponse {
  client_id: string | null
  patient_id: string | null
}

const CalendarSlotsConfirmInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
  client_first: z.string(),
  client_last: z.string(),
  email_address: z.string(),
  phone_number: z.string(),
  patient_name: z.string(),
  appointment_type: z.string(),
  appointment_note: z.string().optional(),
  client_id: z.string().optional(),
  patient_id: z.string().optional(),
})

const CalendarSlotsConfirmOutputSchema = z.object({
  client_id: z.string().nullable(),
  patient_id: z.string().nullable(),
})

type CalendarSlotsConfirmInput = z.infer<typeof CalendarSlotsConfirmInputSchema>
type CalendarSlotsConfirmOutput = z.infer<typeof CalendarSlotsConfirmOutputSchema>

export const calendarSlotsConfirmRegistry: ToolDefinition<
  CalendarSlotsConfirmInput,
  CalendarSlotsConfirmOutput
> = {
  name: 'calendar_slots_confirm',
  description: 'Confirm a calendar slot on the Petbooqz calendar',
  inputs: CalendarSlotsConfirmInputSchema,
  outputSchema: CalendarSlotsConfirmOutputSchema,
  handler: async ({ input, context }) => {
  const client = createClientFromEnv(context.env)
  const response = await client.post<ConfirmSlotResponse>(
    `/calendars/${input.calendar_id}/confirm`,
    {
      client_first: input.client_first,
      client_last: input.client_last,
      email_address: input.email_address,
      phone_number: input.phone_number,
      patient_name: input.patient_name,
      appointment_type: input.appointment_type,
      appointment_note: input.appointment_note,
      client_id: input.client_id,
      patient_id: input.patient_id,
    },
    { slot_id: input.slot_id },
  )

  return {
    output: {
      client_id: response.client_id,
      patient_id: response.patient_id,
    },
    billing: {
      credits: 0,
    },
  }
  },
}
