/**
 * Client Model
 *
 * Client/Owner records from Petbooqz.
 * SHARED model - mapped to user's existing data during installation.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'client',
  label: 'Client',
  labelPlural: 'Clients',
  labelTemplate: '{{ first_name }} {{ last_name }}',
  description: 'Client/Owner records from Petbooqz',
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
