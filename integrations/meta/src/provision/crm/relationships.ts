/**
 * Relationships
 *
 * Defines links between models.
 */

import type { RelationshipDefinition } from 'skedyul'

const relationships: RelationshipDefinition[] = [
  {
    source: {
      model: 'meta_connection',
      field: 'whatsapp_phone_numbers',
      label: 'WhatsApp Phone Numbers',
    },
    target: {
      model: 'whatsapp_phone_number',
      field: 'meta_connection',
      label: 'Meta Connection',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
  {
    source: {
      model: 'meta_connection',
      field: 'facebook_pages',
      label: 'Facebook Pages',
    },
    target: {
      model: 'facebook_page',
      field: 'meta_connection',
      label: 'Meta Connection',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
  {
    source: {
      model: 'meta_connection',
      field: 'instagram_accounts',
      label: 'Instagram Accounts',
    },
    target: {
      model: 'instagram_account',
      field: 'meta_connection',
      label: 'Meta Connection',
    },
    cardinality: 'one_to_many',
    onDelete: 'restrict',
  },
]

export default relationships
