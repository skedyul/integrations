/**
 * In-process coordination for Petbooqz calendar API calls.
 *
 * Uses a promise-chain mutex per key so concurrent tool invocations within the
 * same MCP runtime serialize mutations on a calendar (preventing double-booking
 * races on warm Lambda/container instances).
 *
 * NOTE: We intentionally avoid skedyul's queuedFetch here because published
 * skedyul npm builds used in CodeBuild may not yet export that API. This keeps
 * petbooqz deployable while still serializing per calendar within a runtime.
 */

const chains = new Map<string, Promise<unknown>>()

async function withKeyedMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve()
  const run = previous
    .catch(() => undefined)
    .then(() => fn())

  chains.set(key, run)

  try {
    return await run
  } finally {
    if (chains.get(key) === run) {
      chains.delete(key)
    }
  }
}

/**
 * Coordinate read-only availability checks for a calendar set.
 * Serialized per sorted calendar-id key within this runtime.
 */
export async function withPetbooqzAvailability<T>(
  calendarIds: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const key = `availability:${[...calendarIds].sort().join(',')}`
  return withKeyedMutex(key, fn)
}

/**
 * Serialize calendar mutations (reserve, confirm, release, cancel, book)
 * per calendar ID within this runtime.
 */
export async function withPetbooqzCalendarBooking<T>(
  calendarId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withKeyedMutex(`booking:${calendarId}`, fn)
}
