import type { PetbooqzApiClient } from './api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from './types'

interface AvailableSlot {
  calendar: string
  date: string
  slots: string[]
}

const PER_DATE_TIMEOUT_MS = 15000

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

async function fetchSlotsForDate(
  client: PetbooqzApiClient,
  calendars: string[],
  date: string,
): Promise<string[]> {
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
      console.log(`[slot_availability] Date ${date} returned error: ${getErrorMessage(response)}`)
      return []
    }

    const rawSlots = Array.isArray(response) ? response : []
    return rawSlots.flatMap((slot) =>
      slot.slots.map((timeStr) => normalizeSlotToDatetime(slot.date, timeStr)),
    )
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
    const errorMsg = isTimeout
      ? `Timeout after ${PER_DATE_TIMEOUT_MS / 1000}s`
      : (error instanceof Error ? error.message : 'Unknown error')
    console.log(`[slot_availability] Date ${date} failed: ${errorMsg}`)
    return []
  }
}

/**
 * Fetch and return available datetimes for a calendar, sorted chronologically.
 */
export async function fetchAvailableDatetimes(
  client: PetbooqzApiClient,
  calendarId: string,
  dates: string[],
): Promise<string[]> {
  const results = await Promise.all(
    dates.map((date) => fetchSlotsForDate(client, [calendarId], date)),
  )

  return results.flat().sort()
}
