import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { createClientFromEnv, type PetbooqzApiClient } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface ReserveSlotResponse {
  slot_id: string
}

const CalendarSlotsReserveInputSchema = z.object({
  calendar_id: z.string().describe('The calendar ID to reserve a slot on'),
  datetime: z.string().optional().describe('Single datetime to reserve (YYYY-MM-DD HH:mm:ss). Use this OR datetimes array.'),
  datetimes: z.array(z.string()).optional().describe('Array of datetimes to try in order (YYYY-MM-DD HH:mm:ss). Tool will reserve the first available slot.'),
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

export const calendarSlotsReserveRegistry: ToolDefinition<
  CalendarSlotsReserveInput,
  CalendarSlotsReserveOutput
> = {
  name: 'calendar_slots_reserve',
  label: 'Reserve Calendar Slot',
  description: 'Reserve a calendar slot on the Petbooqz calendar. Accepts either a single datetime or an array of datetimes to try in order (handles race conditions gracefully).',
  inputSchema: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
  config: {
    timeout: 600000,
  },
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    let reservedSlotId: string | null = null

    const datetimesToTry: string[] = []
    if (input.datetimes && input.datetimes.length > 0) {
      datetimesToTry.push(...input.datetimes)
    } else if (input.datetime) {
      datetimesToTry.push(input.datetime)
    }

    if (datetimesToTry.length === 0) {
      return createValidationError('Either datetime or datetimes array is required', 'datetime')
    }

    let lastError: string = 'No slots attempted'

    try {
      for (const datetime of datetimesToTry) {
        try {
          const response = await client.post<ReserveSlotResponse[] | ReserveSlotResponse | PetbooqzErrorResponse>(
            `/calendars/${input.calendar_id}/reserve`,
            {
              datetime,
              duration: input.duration,
              appointment_note: input.appointment_note,
            },
          )

          if (isPetbooqzError(response)) {
            lastError = `${datetime}: ${getErrorMessage(response)}`
            continue
          }

          const slotId = Array.isArray(response) ? response[0]?.slot_id : response.slot_id

          if (!slotId) {
            lastError = `${datetime}: No slot_id returned from API`
            continue
          }

          reservedSlotId = slotId
          return createSuccessResponse({ slot_id: slotId, datetime })
        } catch (error) {
          lastError = `${datetime}: ${error instanceof Error ? error.message : 'Failed to reserve slot'}`
        }
      }

      return createExternalError('Petbooqz', `Failed to reserve any slot. Last error: ${lastError}`)
    } catch (error) {
      if (reservedSlotId) {
        await releaseSlot(client, input.calendar_id, reservedSlotId)
      }
      throw error
    }
  },
}
