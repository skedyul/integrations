/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'compliance_record',
      field: 'phone_numbers',
      label: 'Phone Numbers',
    },
    target: {
      model: 'phone_number',
      field: 'compliance_record',
      label: 'Compliance Record',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
]

export default relationships
