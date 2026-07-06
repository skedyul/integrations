import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { rethrowRateLimitError } from '../lib/response'
import { createClientFromEnv } from '../lib/api_client'
import { withPetbooqzCalendarBooking } from '../lib/booking_queue'
import { reserveAndConfirm } from '../lib/booking_actions'

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
  description:
    'Book a calendar slot on the Petbooqz calendar (atomic reserve + confirm, serialized per calendar)',
  inputSchema: CalendarSlotsBookInputSchema,
  outputSchema: CalendarSlotsBookOutputSchema,
  timeout: 600000,
  queueTouchPoints: petbooqzBookingTouchPoints(3),
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

    return withPetbooqzCalendarBooking(input.calendar_id, async () => {
      try {
        const appointmentType = input.appointment_type ?? input.reason

        if (!appointmentType) {
          return createValidationError('Either appointment_type or reason is required', 'appointment_type')
        }

        const result = await reserveAndConfirm(
          client,
          input.calendar_id,
          input.datetime,
          input.duration,
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
          input.appointment_note,
        )

        if (!result.ok) {
          return createExternalError('Petbooqz', result.error)
        }

        return createSuccessResponse({
          slot_id: result.slotId,
          client_id: result.clientId,
          patient_id: result.patientId,
        })
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to book appointment',
        )
      }
    })
  },
}
