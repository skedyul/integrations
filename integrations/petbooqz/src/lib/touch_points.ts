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
 * Calendar booking mutex touch point for reserve/confirm/book flows.
 * HTTP inside the mutex uses direct fetch — no petbooqz_api queue probes/acquires.
 */
export function petbooqzBookingTouchPoints(
  _estimatedApiCalls?: number,
): QueueTouchPoint[] {
  return [
    {
      queue: 'petbooqz_calendar_booking',
      subKeyFromArg: 'calendar_id',
      estimatedCalls: 1,
      mutexOnly: true,
    },
  ]
}
