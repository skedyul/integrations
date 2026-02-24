/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'email_address',
      field: 'domain',
      label: 'Domain',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'email_domain',
      field: 'addresses',
      label: 'Addresses',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
]

export default relationships
