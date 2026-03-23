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
]

export default relationships
