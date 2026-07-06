import type { QueueTouchPoint } from 'skedyul'

/** Single Petbooqz HTTP call */
export const PETBOOQZ_API_ONE: QueueTouchPoint[] = [
  { queue: 'petbooqz_api', estimatedCalls: 1 },
]

/** Parallel date × calendar availability fetches (upper bound) */
export const PETBOOQZ_API_AVAILABILITY: QueueTouchPoint[] = [
  { queue: 'petbooqz_api', estimatedCalls: 10 },
]

/** Calendar booking mutex + multi-step reserve/confirm flows */
export function petbooqzBookingTouchPoints(
  estimatedApiCalls: number,
): QueueTouchPoint[] {
  return [
    {
      queue: 'petbooqz_calendar_booking',
      subKeyFromArg: 'calendar_id',
      estimatedCalls: estimatedApiCalls,
      mutexOnly: true,
    },
    { queue: 'petbooqz_api', estimatedCalls: estimatedApiCalls },
  ]
}
