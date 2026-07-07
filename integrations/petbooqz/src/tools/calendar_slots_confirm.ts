import { z, type ToolDefinition, type DateTimeBlock, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { withPetbooqzCalendarBooking } from '../lib/booking_queue'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

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
  datetime: z.string().optional().describe('The datetime of the appointment (passed from reserve step)'),
}).refine((input) => Boolean(input.appointment_type || input.reason), {
  message: 'Either appointment_type or reason is required',
  path: ['appointment_type'],
})

const CalendarSlotsConfirmOutputSchema = z.object({
  client_id: z.string().nullable(),
  patient_id: z.string().nullable(),
  datetime: z.string().nullable().describe('The confirmed appointment datetime'),
  calendar_id: z.string().nullable().describe('The calendar ID'),
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
  timeout: 600000,
  queueTouchPoints: petbooqzBookingTouchPoints(2),
  handler: async (input, context) => {
    return withPetbooqzCalendarBooking(input.calendar_id, context.env, async (client) => {
      try {
        const appointmentType = input.appointment_type ?? input.reason

        if (!appointmentType) {
          return createValidationError('Either appointment_type or reason is required', 'appointment_type')
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
          return createExternalError('Petbooqz', getErrorMessage(response))
        }

        // Build DateTimeBlock for booking confirmation
        const dataBlocks: DateTimeBlock[] = []
        if (input.datetime) {
          dataBlocks.push({
            type: 'dateTime',
            title: 'Booking Confirmed',
            subtitle: `${input.patient_name} - ${appointmentType}`,
            datetime: input.datetime,
            duration: 20,
            location: input.calendar_id,
            status: 'confirmed',
            icon: 'check',
          })
        }

        return createSuccessResponse(
          {
            client_id: response.clientid,
            patient_id: response.patientid,
            datetime: input.datetime ?? null,
            calendar_id: input.calendar_id,
          },
          { dataBlocks },
        )
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to confirm slot',
        )
      }
    })
  },
}
