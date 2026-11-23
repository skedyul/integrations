/**
 * Patient entity — Petbooqz patient (pet), matched on Petbooqz ID.
 */

import { defineEntity } from 'skedyul'
import { patientCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'patient',
  label: 'Patient',
  labelPlural: 'Patients',
  description: 'Patient / pet records from Petbooqz',
  crmMapDefaults: patientCrmMapDefaults,
  fields: [
    {
      handle: 'petbooqz_id',
      label: 'Petbooqz ID',
      type: 'string',
      isUnique: true,
      required: true,
    },
    { handle: 'name', label: 'Name', type: 'string' },
    { handle: 'species', label: 'Species', type: 'string' },
    { handle: 'breed', label: 'Breed', type: 'string' },
  ],
  relationships: [
    { handle: 'client', label: 'Owner', targetEntity: 'client' },
  ],
})
