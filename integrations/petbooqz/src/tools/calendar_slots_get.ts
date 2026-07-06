import { z, type ToolDefinition, createSuccessResponse, createNotFoundError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

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

const SlotSchema = z.object({
  slot_id: z.string(),
  datetime: z.string(),
  duration: z.number(),
  client_id: z.string().nullable(),
  patient_id: z.string().nullable(),
  email_address: z.string().nullable(),
  phone_number: z.string().nullable(),
  status: z.string().nullable(),
  calendar: z.string(),
})

const CalendarSlotsGetInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsGetOutputSchema = z.object({
  slot: SlotSchema,
})

type CalendarSlotsGetInput = z.infer<typeof CalendarSlotsGetInputSchema>
type CalendarSlotsGetOutput = z.infer<typeof CalendarSlotsGetOutputSchema>

export const calendarSlotsGetRegistry: ToolDefinition<
  CalendarSlotsGetInput,
  CalendarSlotsGetOutput
> = {
  name: 'calendar_slots_get',
  label: 'Get Calendar Slot',
  description: 'Get calendar slot details on the Petbooqz calendar',
  inputSchema: CalendarSlotsGetInputSchema,
  outputSchema: CalendarSlotsGetOutputSchema,
  timeout: 300000,
  queueTouchPoints: PETBOOQZ_API_ONE,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

      try {
        const response = await client.get<Slot | PetbooqzErrorResponse>(
          `/calendars/${input.calendar_id}/check`,
          { slot_id: input.slot_id },
        )

        if (isPetbooqzError(response)) {
          return createNotFoundError('Calendar Slot', input.slot_id)
        }

        return createSuccessResponse({ slot: response })
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to get slot',
        )
      }
  },
}
