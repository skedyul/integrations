/**
 * Client entity — Petbooqz client / owner, matched on Petbooqz ID.
 */

import { defineEntity } from 'skedyul'
import { clientCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'client',
  label: 'Client',
  labelPlural: 'Clients',
  description: 'Client / owner records from Petbooqz',
  crmMapDefaults: clientCrmMapDefaults,
  fields: [
    {
      handle: 'petbooqz_id',
      label: 'Petbooqz ID',
      type: 'string',
      isUnique: true,
      required: true,
    },
    { handle: 'first_name', label: 'First Name', type: 'string' },
    { handle: 'last_name', label: 'Last Name', type: 'string' },
    { handle: 'email', label: 'Email', type: 'string' },
    { handle: 'phone', label: 'Phone', type: 'string' },
  ],
  relationships: [
    { handle: 'patients', label: 'Patients', targetEntity: 'patient' },
  ],
})
