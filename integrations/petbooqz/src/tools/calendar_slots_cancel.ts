import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

const CalendarSlotsCancelInputSchema = z.object({
  calendar_id: z.string(),
  slot_id: z.string(),
})

const CalendarSlotsCancelOutputSchema = z.object({
  messagecode: z.string().optional(),
  message: z.string().optional(),
})

type CalendarSlotsCancelInput = z.infer<typeof CalendarSlotsCancelInputSchema>
type CalendarSlotsCancelOutput = z.infer<typeof CalendarSlotsCancelOutputSchema>

export const calendarSlotsCancelRegistry: ToolDefinition<
  CalendarSlotsCancelInput,
  CalendarSlotsCancelOutput
> = {
  name: 'calendar_slots_cancel',
  label: 'Cancel Calendar Slot',
  description: 'Cancel a calendar slot on the Petbooqz calendar',
  inputSchema: CalendarSlotsCancelInputSchema,
  outputSchema: CalendarSlotsCancelOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.delete<unknown | PetbooqzErrorResponse>(
        `/calendars/${input.calendar_id}/cancel`,
        { slot_id: input.slot_id },
      )

      console.log('response', response)

      if (isPetbooqzError(response)) {
        return createToolResponse<CalendarSlotsCancelOutput>('calendar_slots_cancel', {
          success: false,
          error: getErrorMessage(response as PetbooqzErrorResponse),
        })
      }

      const successMessage =
        typeof response === 'object' && response !== null && 'message' in response
          ? String((response as { message?: unknown }).message)
          : 'Slot cancelled'

      return createToolResponse('calendar_slots_cancel', {
        success: true,
        data: {
          messagecode:
            typeof response === 'object' && response !== null && 'messagecode' in response
              ? String((response as { messagecode?: unknown }).messagecode)
              : undefined,
          message: successMessage,
        },
        message: successMessage,
      })
    } catch (error) {


      console.log('error', error)
      return createToolResponse<CalendarSlotsCancelOutput>('calendar_slots_cancel', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel slot',
      })
    }
  },
}
