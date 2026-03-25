/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'email_domain',
      field: 'addresses',
      label: 'Addresses',
    },
    target: {
      model: 'email_address',
      field: 'domain',
      label: 'Domain',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
]

export default relationships
