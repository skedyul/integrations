/**
 * Patient Model
 *
 * Patient/Pet records from Petbooqz.
 * SHARED model - mapped to user's existing data during installation.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'patient',
  label: 'Patient',
  labelPlural: 'Patients',
  labelTemplate: '{{ name }}',
  description: 'Patient/Pet records from Petbooqz',
  scope: 'shared',

  fields: [
    {
      handle: 'petbooqz_id',
      label: 'Petbooqz ID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'External ID from Petbooqz system',
      owner: 'app',
    },
  ],
})
