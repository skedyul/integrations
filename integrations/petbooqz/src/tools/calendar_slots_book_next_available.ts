import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { rethrowRateLimitError } from '../lib/response'
import { createClientFromEnv } from '../lib/api_client'
import { withPetbooqzCalendarBooking } from '../lib/booking_queue'
import { reserveAndConfirm } from '../lib/booking_actions'
import { fetchAvailableDatetimes } from '../lib/slot_availability'

const DEFAULT_MAX_ATTEMPTS = 20

const CalendarSlotsBookNextAvailableInputSchema = z.object({
  calendar_id: z.string().describe('The calendar ID to book on'),
  dates: z.array(z.string()).min(1).describe('Dates to search for availability (YYYY-MM-DD)'),
  duration: z.string().describe('Duration in minutes'),
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
  max_attempts: z.number().int().min(1).max(100).optional().describe('Max slot reserve attempts (default 20)'),
}).refine((input) => Boolean(input.appointment_type || input.reason), {
  message: 'Either appointment_type or reason is required',
  path: ['appointment_type'],
})

const CalendarSlotsBookNextAvailableOutputSchema = z.object({
  slot_id: z.string(),
  datetime: z.string().describe('The confirmed appointment datetime'),
  client_id: z.string().nullable(),
  patient_id: z.string().nullable(),
  calendar_id: z.string(),
})

type CalendarSlotsBookNextAvailableInput = z.infer<typeof CalendarSlotsBookNextAvailableInputSchema>
type CalendarSlotsBookNextAvailableOutput = z.infer<typeof CalendarSlotsBookNextAvailableOutputSchema>

export const calendarSlotsBookNextAvailableRegistry: ToolDefinition<
  CalendarSlotsBookNextAvailableInput,
  CalendarSlotsBookNextAvailableOutput
> = {
  name: 'calendar_slots_book_next_available',
  label: 'Book Next Available Calendar Slot',
  description:
    'Find the earliest available slot in a date window and book it atomically (reserve + confirm under one queue lock)',
  inputSchema: CalendarSlotsBookNextAvailableInputSchema,
  outputSchema: CalendarSlotsBookNextAvailableOutputSchema,
  timeout: 600000,
  queueTouchPoints: petbooqzBookingTouchPoints(25),
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    const appointmentType = input.appointment_type ?? input.reason

    if (!appointmentType) {
      return createValidationError('Either appointment_type or reason is required', 'appointment_type')
    }

    const maxAttempts = input.max_attempts ?? DEFAULT_MAX_ATTEMPTS

    return withPetbooqzCalendarBooking(input.calendar_id, async () => {
      const datetimes = await fetchAvailableDatetimes(client, input.calendar_id, input.dates)

      if (datetimes.length === 0) {
        return createExternalError('Petbooqz', 'No available slots found in the requested date window')
      }

      const details = {
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
      }

      let lastError = 'No slots attempted'
      const slotsToTry = datetimes.slice(0, maxAttempts)

      for (const datetime of slotsToTry) {
        const result = await reserveAndConfirm(
          client,
          input.calendar_id,
          datetime,
          input.duration,
          details,
          input.appointment_note,
        )

        if (result.ok) {
          return createSuccessResponse({
            slot_id: result.slotId,
            datetime: result.datetime,
            client_id: result.clientId,
            patient_id: result.patientId,
            calendar_id: input.calendar_id,
          })
        }

        lastError = `${datetime}: ${result.error}`
      }

      return createExternalError(
        'Petbooqz',
        `Failed to book any slot in the date window. Last error: ${lastError}`,
      )
    })
  },
}
