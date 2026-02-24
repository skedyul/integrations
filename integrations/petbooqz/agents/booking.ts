/**
 * Booking Agent
 *
 * Books appointments and checks availability.
 */

import { defineAgent } from 'skedyul'

export default defineAgent({
  handle: 'booking_agent',
  label: 'Booking Agent',
  description: 'Books appointments and checks availability',
  system: `Appointment booking assistant. Book appointments and check availability.

Tools:
- calendar_slots_availability_list: Check available slots for date/calendar
- calendar_slots_book: Book an appointment (reserves and confirms in one step)

Slot times are 12-hour format. Bookings are confirmed immediately.`,
  tools: ['calendar_slots_availability_list', 'calendar_slots_book'],
  parentAgent: 'composer',
})
