/**
 * Appointment Model
 *
 * Appointment records from Petbooqz.
 * SHARED model - mapped to user's existing data during installation.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'appointment',
  label: 'Appointment',
  labelPlural: 'Appointments',
  labelTemplate: '{{ title }}',
  description: 'Appointment records from Petbooqz',
  scope: 'shared',

  fields: [
    {
      handle: 'petbooqz_id',
      label: 'Petbooqz ID',
      type: 'string',
      required: false,
      system: true,
      description: 'External ID from Petbooqz system',
      owner: 'app',
    },
  ],
})
