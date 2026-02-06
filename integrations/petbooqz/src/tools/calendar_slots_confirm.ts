import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface ConfirmSlotResponse {
  clientid: string
  patientid: string
}

const CalendarSlotsConfirmInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
  client_first: z.string(),
  client_last: z.string(),
  email_address: z.string(),
  phone_number: z.string(),
  patient_name: z.string(),
  appointment_type: z.string().optional(),
  reason: z.string().optional(),
  appointment_note: z.string().optional(),
  client_id: z.string().optional(),
  patient_id: z.string().optional(),
}).refine((input) => Boolean(input.appointment_type || input.reason), {
  message: 'Either appointment_type or reason is required',
  path: ['appointment_type'],
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
  label: 'Confirm Calendar Slot',
  description: 'Confirm a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsConfirmInputSchema,
  outputSchema: CalendarSlotsConfirmOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const appointmentType = input.appointment_type ?? input.reason

      if (!appointmentType) {
        return createToolResponse<CalendarSlotsConfirmOutput>('calendar_slots_confirm', {
          success: false,
          error: 'Either appointment_type or reason is required',
        })
      }

      const response = await client.post<ConfirmSlotResponse | PetbooqzErrorResponse>(
      `/calendars/${input.calendar_id}/confirm`,
      {
        client_first: input.client_first,
        client_last: input.client_last,
        email_address: input.email_address,
        phone_number: input.phone_number,
        patient_name: input.patient_name,
        appointment_type: appointmentType,
        reason: input.reason,
        appointment_note: input.appointment_note,
        client_id: input.client_id,
        patient_id: input.patient_id,
      },
      { slot_id: input.slot_id },
    )

      console.log('response', response)

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsConfirmOutput>('calendar_slots_confirm', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      return createToolResponse('calendar_slots_confirm', {
        success: true,
        data: {
          client_id: response.clientid,
          patient_id: response.patientid,
        },
        message: 'Slot confirmed',
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsConfirmOutput>('calendar_slots_confirm', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm slot',
      })
    }
  },
}
