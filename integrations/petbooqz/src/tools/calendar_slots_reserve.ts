import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
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

export const calendarSlotsReserveRegistry: ToolDefinition<
  CalendarSlotsReserveInput,
  CalendarSlotsReserveOutput
> = {
  name: 'calendar_slots_reserve',
  label: 'Reserve Calendar Slot',
  description: 'Reserve a calendar slot on the Petbooqz calendar. Accepts either a single datetime or an array of datetimes to try in order (handles race conditions gracefully).',
  inputSchema: CalendarSlotsReserveInputSchema,
  outputSchema: CalendarSlotsReserveOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

    // Build list of datetimes to try
    const datetimesToTry: string[] = []
    if (input.datetimes && input.datetimes.length > 0) {
      datetimesToTry.push(...input.datetimes)
    } else if (input.datetime) {
      datetimesToTry.push(input.datetime)
    }

    if (datetimesToTry.length === 0) {
      return createToolResponse<CalendarSlotsReserveOutput>('calendar_slots_reserve', {
        success: false,
        error: 'Either datetime or datetimes array is required',
      })
    }

    let lastError: string = 'No slots attempted'

    // Try each datetime in order until one succeeds
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
          continue // Try next datetime
        }

        // API returns array with single object or single object
        const slotId = Array.isArray(response) ? response[0]?.slot_id : response.slot_id

        if (!slotId) {
          lastError = `${datetime}: No slot_id returned from API`
          continue // Try next datetime
        }

        // Success!
        return createToolResponse('calendar_slots_reserve', {
          success: true,
          data: { slot_id: slotId, datetime },
          message: `Slot ${slotId} reserved for ${datetime}`,
        })
      } catch (error) {
        lastError = `${datetime}: ${error instanceof Error ? error.message : 'Failed to reserve slot'}`
        // Continue to next datetime
      }
    }

    // All datetimes failed
    return createToolResponse<CalendarSlotsReserveOutput>('calendar_slots_reserve', {
      success: false,
      error: `Failed to reserve any slot. Last error: ${lastError}`,
    })
  },
}
