import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv, type PetbooqzApiClient } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

const AvailableSlotSchema = z.object({
  calendar: z.string(),
  date: z.string(),
  slots: z.array(z.string()),
})

const CalendarSlotsAvailabilityListInputSchema = z.object({
  calendars: z.array(z.string()).min(1),
  dates: z.array(z.string()).min(1),
})

const CalendarSlotsAvailabilityListOutputSchema = z.object({
  availableSlots: z.array(AvailableSlotSchema),
})

type CalendarSlotsAvailabilityListInput = z.infer<typeof CalendarSlotsAvailabilityListInputSchema>
type CalendarSlotsAvailabilityListOutput = z.infer<typeof CalendarSlotsAvailabilityListOutputSchema>

const PER_DATE_TIMEOUT_MS = 15000

async function fetchSlotsForDate(
  client: PetbooqzApiClient,
  calendars: string[],
  date: string,
): Promise<{ date: string; slots: AvailableSlot[]; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PER_DATE_TIMEOUT_MS)
    
    const response = await client.post<AvailableSlot[] | PetbooqzErrorResponse>(
      '/slots',
      { calendars, dates: [date] },
      undefined,
      undefined,
      controller.signal,
    )
    
    clearTimeout(timeoutId)

    if (isPetbooqzError(response)) {
      console.log(`[calendar_slots_availability_list] Date ${date} returned error: ${getErrorMessage(response)}`)
      return { date, slots: [], error: getErrorMessage(response) }
    }

    const slots = Array.isArray(response) ? response : []
    console.log(`[calendar_slots_availability_list] Date ${date} returned ${slots.length} calendar(s) with slots`)
    return { date, slots }
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
    const errorMsg = isTimeout 
      ? `Timeout after ${PER_DATE_TIMEOUT_MS / 1000}s` 
      : (error instanceof Error ? error.message : 'Unknown error')
    console.log(`[calendar_slots_availability_list] Date ${date} failed: ${errorMsg}`)
    return { date, slots: [], error: errorMsg }
  }
}

export const calendarSlotsAvailabilityListRegistry: ToolDefinition<
  CalendarSlotsAvailabilityListInput,
  CalendarSlotsAvailabilityListOutput
> = {
  name: 'calendar_slots_availability_list',
  label: 'List Available Calendar Slots',
  description: 'List available calendar slots for given calendars and dates on the Petbooqz calendar',
  inputSchema: CalendarSlotsAvailabilityListInputSchema,
  outputSchema: CalendarSlotsAvailabilityListOutputSchema,
  timeout: 120000,
  handler: async (input, context) => {
    console.log('[calendar_slots_availability_list] Starting handler', { 
      calendars: input.calendars, 
      dates: input.dates 
    })
    
    const client = createClientFromEnv(context.env)
    
    // Fetch each date individually with its own timeout
    const results = await Promise.all(
      input.dates.map(date => fetchSlotsForDate(client, input.calendars, date))
    )
    
    // Collect all successful slots
    const availableSlots: AvailableSlot[] = []
    const failedDates: string[] = []
    
    for (const result of results) {
      if (result.error) {
        failedDates.push(result.date)
      }
      availableSlots.push(...result.slots)
    }
    
    const totalSlots = availableSlots.reduce((sum, s) => sum + s.slots.length, 0)
    const successfulDates = input.dates.length - failedDates.length
    
    let message = `Found ${totalSlots} available slot${totalSlots !== 1 ? 's' : ''} across ${availableSlots.length} calendar${availableSlots.length !== 1 ? 's' : ''}`
    if (failedDates.length > 0) {
      message += ` (${failedDates.length} date${failedDates.length !== 1 ? 's' : ''} skipped due to timeout/error: ${failedDates.join(', ')})`
    }
    
    console.log('[calendar_slots_availability_list] Completed', { 
      totalSlots, 
      successfulDates, 
      failedDates 
    })

    return createToolResponse('calendar_slots_availability_list', {
      success: true,
      data: { availableSlots },
      message,
    })
  },
}
