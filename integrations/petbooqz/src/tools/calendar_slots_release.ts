import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { withPetbooqzCalendarBooking } from '../lib/booking_queue'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

const CalendarSlotsReleaseInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsReleaseOutputSchema = z.object({})

type CalendarSlotsReleaseInput = z.infer<typeof CalendarSlotsReleaseInputSchema>
type CalendarSlotsReleaseOutput = z.infer<typeof CalendarSlotsReleaseOutputSchema>

export const calendarSlotsReleaseRegistry: ToolDefinition<
  CalendarSlotsReleaseInput,
  CalendarSlotsReleaseOutput
> = {
  name: 'calendar_slots_release',
  label: 'Release Calendar Slot',
  description: 'Release a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsReleaseInputSchema,
  outputSchema: CalendarSlotsReleaseOutputSchema,
  queueTouchPoints: petbooqzBookingTouchPoints(2),
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

    return withPetbooqzCalendarBooking(input.calendar_id, async () => {
      try {
        const slotCheck = await client.get<unknown | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/check`,
        { slot_id: input.slot_id },
      )

      if (isPetbooqzError(slotCheck)) {
        return createExternalError('Petbooqz', getErrorMessage(slotCheck))
      }

      const response = await client.delete<unknown | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/release`,
        { slot_id: input.slot_id },
      )

      if (isPetbooqzError(response)) {
        return createExternalError('Petbooqz', getErrorMessage(response as PetbooqzErrorResponse))
      }

      return createSuccessResponse({})
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to release slot',
        )
      }
  },
}
