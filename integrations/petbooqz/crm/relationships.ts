/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'client',
      field: 'patients',
      label: 'Patients',
    },
    target: {
      model: 'patient',
      field: 'owner',
      label: 'Owner',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
  {
    source: {
      model: 'patient',
      field: 'appointments',
      label: 'Appointments',
    },
    target: {
      model: 'appointment',
      field: 'patient',
      label: 'Patient',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
]

export default relationships
