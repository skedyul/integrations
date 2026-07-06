import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv, type PetbooqzApiClient } from '../lib/api_client'
import { withPetbooqzCalendarBooking } from '../lib/booking_queue'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

export interface ReserveSlotResponse {
  slot_id: string
}

const CalendarSlotsReserveInputSchema = z.object({
  calendar_id: z.string().describe('The calendar ID to reserve a slot on'),
  datetime: z.string().optional().describe('Single datetime to reserve (YYYY-MM-DD HH:mm:ss). Use this OR datetimes array.'),
  datetimes: z.array(z.string()).optional().describe('Ordered list of datetimes to try (earliest preferred). Used when the first choice is no longer available.'),
  duration: z.string().describe('Duration in minutes'),
  appointment_note: z.string().optional().describe('Optional note for the appointment'),
}).refine((input) => Boolean(input.datetime || (input.datetimes && input.datetimes.length > 0)), {
  message: 'Either datetime or datetimes array is required',
  path: ['datetime'],
})

const CalendarSlotsReserveOutputSchema = z.object({
  slot_id: z.string(),
  datetime: z.string().describe('The datetime that was successfully reserved'),
})

type CalendarSlotsReserveInput = z.infer<typeof CalendarSlotsReserveInputSchema>
type CalendarSlotsReserveOutput = z.infer<typeof CalendarSlotsReserveOutputSchema>

async function releaseSlot(client: PetbooqzApiClient, calendarId: string, slotId: string): Promise<void> {
  try {
    await client.delete(`/calendars/${calendarId}/release`, { slot_id: slotId })
  } catch {
    // Ignore release errors - best effort cleanup
  }
}

async function reserveSlotAttempt(
  client: PetbooqzApiClient,
  calendarId: string,
  datetime: string,
  duration: string,
  appointmentNote: string | undefined,
): Promise<{ slotId: string; datetime: string } | { error: string }> {
  const response = await client.post<ReserveSlotResponse[] | ReserveSlotResponse | PetbooqzErrorResponse>(
    `/calendars/${calendarId}/reserve`,
    {
      datetime,
      duration,
      appointment_note: appointmentNote,
    },
  )

  if (isPetbooqzError(response)) {
    return { error: getErrorMessage(response) }
  }

  const slotId = Array.isArray(response) ? response[0]?.slot_id : response.slot_id
  if (!slotId) {
    return { error: 'No slot_id returned from API' }
  }

  return { slotId, datetime }
}

export const calendarSlotsReserveRegistry: ToolDefinition<
  CalendarSlotsReserveInput,
  CalendarSlotsReserveOutput
> = {
  name: 'calendar_slots_reserve',
  label: 'Reserve Calendar Slot',
  description:
    'Reserve a calendar slot on the Petbooqz calendar. Mutations are serialized per calendar to prevent duplicate bookings. Pass a single datetime for agent bookings, or an ordered datetimes list to try alternatives.',
  inputSchema: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
  timeout: 600000,
  queueTouchPoints: petbooqzBookingTouchPoints(2),
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

    const datetimesToTry: string[] = []
    if (input.datetimes && input.datetimes.length > 0) {
      datetimesToTry.push(...input.datetimes)
    } else if (input.datetime) {
      datetimesToTry.push(input.datetime)
    }

    if (datetimesToTry.length === 0) {
      return createValidationError('Either datetime or datetimes array is required', 'datetime')
    }

    return withPetbooqzCalendarBooking(input.calendar_id, async () => {
      let reservedSlotId: string | null = null
      let lastError = 'No slots attempted'

      try {
        for (const datetime of datetimesToTry) {
          try {
            const result = await reserveSlotAttempt(
              client,
              input.calendar_id,
              datetime,
              input.duration,
              input.appointment_note,
            )

            if ('error' in result) {
              lastError = `${datetime}: ${result.error}`
              continue
            }

            reservedSlotId = result.slotId
            return createSuccessResponse({
              slot_id: result.slotId,
              datetime: result.datetime,
            })
          } catch (error) {
            rethrowRateLimitError(error)
            lastError = `${datetime}: ${error instanceof Error ? error.message : 'Failed to reserve slot'}`
          }
        }

        return createExternalError('Petbooqz', `Failed to reserve any slot. Last error: ${lastError}`)
      } catch (error) {
        rethrowRateLimitError(error)
        if (reservedSlotId) {
          await releaseSlot(client, input.calendar_id, reservedSlotId)
        }
        throw error
      }
    })
  },
}
