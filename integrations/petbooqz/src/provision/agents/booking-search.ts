/**
 * Booking Search Agent
 *
 * Finds clients and patients by name, email, or phone.
 */

import { defineAgent } from 'skedyul'

export default defineAgent({
  handle: 'booking_search_agent',
  label: 'Booking Search Agent',
  description: 'Finds clients and patients by name, email, or phone',
  system: `Client and patient lookup assistant. Search and retrieve client/patient records.

Workflow:
1. Use clients_search to find clients by name, email, or phone
2. Use clients_get to retrieve full client details
3. Use patients_get to get pet details using patient_id from client record

Always confirm which client/patient before proceeding.`,
  tools: ['clients_search', 'clients_get', 'patients_get'],
  parentAgent: 'composer',
})
