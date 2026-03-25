/**
 * Booking Cancel Agent
 *
 * Cancels appointments and checks appointment status.
 */

import { defineAgent } from 'skedyul'

export default defineAgent({
  handle: 'booking_cancel_agent',
  label: 'Booking Cancel Agent',
  description: 'Cancels appointments and checks appointment status',
  system: `Appointment cancellation assistant. Cancel appointments and check status.

Tools:
- calendar_slots_get: Check appointment status/details
- calendar_slots_cancel: Cancel a confirmed appointment

Use calendar_slots_get to verify appointment details before canceling.`,
  tools: ['calendar_slots_get', 'calendar_slots_cancel'],
  parentAgent: 'composer',
})
