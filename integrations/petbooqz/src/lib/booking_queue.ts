import { queuedFetch } from 'skedyul'

/**
 * Serialize read-only availability checks per calendar set.
 * Multiple agents can check availability concurrently (up to queue maxConcurrent),
 * but Petbooqz API calls are rate-limited per install.
 */
export async function withPetbooqzAvailability<T>(
  calendarIds: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const key = [...calendarIds].sort().join(',')
  return queuedFetch({ queue: 'petbooqz_availability', key }, fn)
}

/**
 * Serialize all calendar mutations (reserve, confirm, release, cancel, book)
 * per calendar ID. Prevents concurrent double-booking on the same calendar/slot.
 */
export async function withPetbooqzCalendarBooking<T>(
  calendarId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return queuedFetch({ queue: 'petbooqz_calendar_booking', key: calendarId }, fn)
}
