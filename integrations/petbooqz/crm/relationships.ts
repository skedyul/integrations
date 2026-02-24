/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'patient',
      field: 'owner',
      label: 'Owner',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'client',
      field: 'patients',
      label: 'Patients',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
  {
    source: {
      model: 'appointment',
      field: 'patient',
      label: 'Patient',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'patient',
      field: 'appointments',
      label: 'Appointments',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
]

export default relationships
