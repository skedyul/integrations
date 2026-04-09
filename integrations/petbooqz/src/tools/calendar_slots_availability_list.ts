import { z, type ToolDefinition, createSuccessResponse } from 'skedyul'
import { createClientFromEnv, type PetbooqzApiClient } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

function convertTo24Hour(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '09:00'
  const parts = timeStr.trim().split(' ')
  if (parts.length !== 2) return timeStr
  const [timePart, meridiem] = parts
  const timeParts = timePart.split(':')
  let hour = Number(timeParts[0])
  const minute = (timeParts[1] || '00').padStart(2, '0')
  if (Number.isNaN(hour)) return '09:00'
  if (meridiem.toUpperCase() === 'PM' && hour !== 12) hour += 12
  else if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function normalizeSlotToDatetime(date: string, timeStr: string): string {
  const time24 = convertTo24Hour(timeStr)
  return `${date} ${time24}:00`
}

const AvailableSlotSchema = z.object({
  calendar: z.string(),
  date: z.string(),
  slots: z.array(z.string()).describe('Array of full datetime strings (YYYY-MM-DD HH:mm:ss)'),
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

    const rawSlots = Array.isArray(response) ? response : []
    const normalizedSlots = rawSlots.map(slot => ({
      ...slot,
      slots: slot.slots.map(timeStr => normalizeSlotToDatetime(slot.date, timeStr)),
    }))
    console.log(`[calendar_slots_availability_list] Date ${date} returned ${rawSlots.length} calendar(s) with slots`)
    return { date, slots: normalizedSlots }
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
  config: {
    timeout: 120000,
  },
  handler: async (input, context) => {
    console.log('[calendar_slots_availability_list] Starting handler', {
      calendars: input.calendars,
      dates: input.dates,
    })

    const client = createClientFromEnv(context.env)

    const results = await Promise.all(
      input.dates.map(date => fetchSlotsForDate(client, input.calendars, date)),
    )

    const availableSlots: AvailableSlot[] = []
    const failedDates: string[] = []

    for (const result of results) {
      if (result.error) {
        failedDates.push(result.date)
      }
      availableSlots.push(...result.slots)
    }

    const totalSlots = availableSlots.reduce((sum, s) => sum + s.slots.length, 0)

    console.log('[calendar_slots_availability_list] Completed', {
      totalSlots,
      successfulDates: input.dates.length - failedDates.length,
      failedDates,
    })

    return createSuccessResponse({ availableSlots })
  },
}
