/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'whatsapp_phone_number',
      field: 'meta_connection',
      label: 'Meta Connection',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'meta_connection',
      field: 'whatsapp_phone_numbers',
      label: 'WhatsApp Phone Numbers',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
  {
    source: {
      model: 'facebook_page',
      field: 'meta_connection',
      label: 'Meta Connection',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'meta_connection',
      field: 'facebook_pages',
      label: 'Facebook Pages',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
  {
    source: {
      model: 'instagram_account',
      field: 'meta_connection',
      label: 'Meta Connection',
      cardinality: 'many_to_one',
      onDelete: 'restrict',
    },
    target: {
      model: 'meta_connection',
      field: 'instagram_accounts',
      label: 'Instagram Accounts',
      cardinality: 'one_to_many',
      onDelete: 'none',
    },
  },
]

export default relationships
