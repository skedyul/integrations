import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import type { ReserveSlotResponse } from './calendar_slots_reserve'
import type { ConfirmSlotResponse } from './calendar_slots_confirm'

const CalendarSlotsBookInputSchema = z.object({
  calendar_id: z.string(),
  datetime: z.string(),
  duration: z.string(),
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

const CalendarSlotsBookOutputSchema = z.object({
  slot_id: z.string(),
  client_id: z.string().nullable(),
  patient_id: z.string().nullable(),
})

type CalendarSlotsBookInput = z.infer<typeof CalendarSlotsBookInputSchema>
type CalendarSlotsBookOutput = z.infer<typeof CalendarSlotsBookOutputSchema>

export const calendarSlotsBookRegistry: ToolDefinition<
  CalendarSlotsBookInput,
  CalendarSlotsBookOutput
> = {
  name: 'calendar_slots_book',
  label: 'Book Calendar Slot',
  description: 'Book a calendar slot on the Petbooqz calendar (reserves and confirms in one step)',
  inputSchema: CalendarSlotsBookInputSchema,
  outputSchema: CalendarSlotsBookOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const appointmentType = input.appointment_type ?? input.reason

      if (!appointmentType) {
        return createToolResponse<CalendarSlotsBookOutput>('calendar_slots_book', {
          success: false,
          error: 'Either appointment_type or reason is required',
        })
      }

      // Step 1: Reserve the slot
      const reserveResponse = await client.post<ReserveSlotResponse[] | ReserveSlotResponse | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/reserve`,
        {
          datetime: input.datetime,
          duration: input.duration,
          appointment_note: input.appointment_note,
        },
      )

      if (isPetbooqzError(reserveResponse)) {
        return createToolResponse<CalendarSlotsBookOutput>('calendar_slots_book', {
          success: false,
          error: getErrorMessage(reserveResponse),
        })
      }

      // API returns array with single object or single object
      const slotId = Array.isArray(reserveResponse) ? reserveResponse[0]?.slot_id : reserveResponse.slot_id
      
      if (!slotId) {
        return createToolResponse<CalendarSlotsBookOutput>('calendar_slots_book', {
          success: false,
          error: 'No slot_id returned from reserve API',
        })
      }

      // Step 2: Immediately confirm the reserved slot
      const confirmResponse = await client.post<ConfirmSlotResponse | PetbooqzErrorResponse>(
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
        { slot_id: slotId },
      )

      if (isPetbooqzError(confirmResponse)) {
        return createToolResponse<CalendarSlotsBookOutput>('calendar_slots_book', {
          success: false,
          error: getErrorMessage(confirmResponse),
        })
      }

      return createToolResponse('calendar_slots_book', {
        success: true,
        data: {
          slot_id: slotId,
          client_id: confirmResponse.clientid,
          patient_id: confirmResponse.patientid,
        },
        message: 'Appointment booked and confirmed',
      })
    } catch (error) {
      return createToolResponse<CalendarSlotsBookOutput>('calendar_slots_book', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to book appointment',
      })
    }
  },
}
