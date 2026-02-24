/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'phone_number',
      field: 'compliance_record',
      label: 'Compliance Record',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'compliance_record',
      field: 'phone_numbers',
      label: 'Phone Numbers',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
]

export default relationships
