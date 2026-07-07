import { queuedFetch } from 'skedyul'
import { createDirectClientFromEnv, type PetbooqzApiClient } from './api_client'

/**
 * Serialize calendar mutations (reserve, confirm, release, cancel, book)
 * per calendar ID. Prevents concurrent double-booking on the same calendar/slot.
 *
 * HTTP inside the mutex uses a direct client (no nested petbooqz_api queuedFetch).
 * The api leaky bucket still applies per-call for all other tools.
 */
export async function withPetbooqzCalendarBooking<T>(
  calendarId: string,
  env: Record<string, string | undefined>,
  fn: (client: PetbooqzApiClient) => Promise<T>,
): Promise<T> {
  return queuedFetch({ queue: 'petbooqz_calendar_booking', key: calendarId }, () => {
    console.log(
      `[petbooqz] calendar booking mutex acquired for ${calendarId} (direct HTTP, no nested api queue)`,
    )
    const client = createDirectClientFromEnv(env)
    return fn(client)
  })
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
