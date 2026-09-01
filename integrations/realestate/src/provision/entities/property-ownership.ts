/**
 * Property ownership entity — customer↔property join from a REA enquiry.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "property_ownership".
 */

import { defineEntity } from 'skedyul'
import { propertyOwnershipCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'property_ownership',
  label: 'Property Ownership',
  labelPlural: 'Property Ownerships',
  description:
    'Join record linking the enquiring customer to the listing property',
  crmMapDefaults: propertyOwnershipCrmMapDefaults,
  fields: [
    {
      handle: 'ownership_key',
      label: 'Ownership Key',
      type: 'string',
      isUnique: true,
      required: true,
      description: 'Idempotent match key for a customer + property pair',
    },
    {
      handle: 'role',
      label: 'Role',
      type: 'string',
      options: [
        { value: 'owner', label: 'Owner' },
        { value: 'joint_owner', label: 'Joint Owner' },
        { value: 'occupier', label: 'Occupier' },
        { value: 'previous_owner', label: 'Previous Owner' },
      ],
    },
  ],
  relationships: [
    { handle: 'customer', label: 'Customer', targetEntity: 'customer' },
    { handle: 'property', label: 'Property', targetEntity: 'property' },
  ],
})
