/**
 * Appointments Page
 *
 * Configure Appointment Model Mapping.
 *
 * Path: /appointments
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'appointments',
  label: 'Appointments',
  type: 'instance',
  path: '/appointments',
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'appointment',
    },
  ],
})
