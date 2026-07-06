import { queuedFetch } from 'skedyul'

/**
 * Serialize calendar mutations (reserve, confirm, release, cancel, book)
 * per calendar ID. Prevents concurrent double-booking on the same calendar/slot.
 */
export async function withPetbooqzCalendarBooking<T>(
  calendarId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return queuedFetch({ queue: 'petbooqz_calendar_booking', key: calendarId }, fn)
}

/** @deprecated HTTP rate limiting is enforced in PetbooqzApiClient.request() */
export async function withPetbooqzApi<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}

/** @deprecated HTTP rate limiting is enforced per request in PetbooqzApiClient */
export async function withPetbooqzAvailability<T>(
  _calendarIds: string[],
  fn: () => Promise<T>,
): Promise<T> {
  return fn()
}
