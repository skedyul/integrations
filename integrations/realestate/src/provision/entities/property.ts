/**
 * Property entity — listing fields from a REA enquiry payload.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "property".
 */

import { defineEntity } from 'skedyul'
import { propertyCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'property',
  label: 'Property',
  labelPlural: 'Properties',
  description: 'Listing from a realestate.com.au enquiry',
  crmMapDefaults: propertyCrmMapDefaults,
  fields: [
    {
      handle: 'listing_id',
      label: 'Listing ID',
      type: 'string',
      isUnique: true,
    },
    { handle: 'address', label: 'Address', type: 'string' },
  ],
})
