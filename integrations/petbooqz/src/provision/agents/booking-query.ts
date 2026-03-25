/**
 * Booking Query Agent
 *
 * Answers questions about calendars and availability.
 */

import { defineAgent } from 'skedyul'

export default defineAgent({
  handle: 'booking_query_agent',
  label: 'Booking Query Agent',
  description: 'Answers questions about calendars and availability',
  system: `Veterinary booking query assistant. Answer questions about calendars and availability.
Tools:
- calendars_list: List available calendars/rooms
- calendar_slots_availability_list: Check available slots for date/calendar

For availability queries, ask for date and calendar name if not provided.`,
  tools: ['calendars_list', 'calendar_slots_availability_list'],
  parentAgent: 'composer',
})
