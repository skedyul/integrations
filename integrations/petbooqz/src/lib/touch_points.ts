import type { QueueTouchPoint } from 'skedyul'

/** Single Petbooqz HTTP call */
export const PETBOOQZ_API_ONE: QueueTouchPoint[] = [
  { queue: 'petbooqz_api', estimatedCalls: 1 },
]

/** Parallel date × calendar availability fetches (upper bound) */
export const PETBOOQZ_API_AVAILABILITY: QueueTouchPoint[] = [
  { queue: 'petbooqz_api', estimatedCalls: 10 },
]

/**
 * Calendar booking mutex + optional Petbooqz API capacity for workflow probes.
 * HTTP inside the mutex uses direct fetch — nested petbooqz_api queuedFetch is skipped.
 */
export function petbooqzBookingTouchPoints(
  estimatedApiCalls = 1,
): QueueTouchPoint[] {
  const touchPoints: QueueTouchPoint[] = [
    {
      queue: 'petbooqz_calendar_booking',
      subKeyFromArg: 'calendar_id',
      estimatedCalls: 1,
      mutexOnly: true,
    },
  ]

  if (estimatedApiCalls > 0) {
    touchPoints.push({
      queue: 'petbooqz_api',
      estimatedCalls: estimatedApiCalls,
    })
  }

  return touchPoints
}
