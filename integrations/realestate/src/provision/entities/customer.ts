/**
 * Customer entity — person fields from a REA enquiry payload.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "customer".
 */

import { defineEntity } from 'skedyul'
import { customerCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'customer',
  label: 'Customer',
  labelPlural: 'Customers',
  description:
    'Contact from a realestate.com.au enquiry (name, phone, email)',
  crmMapDefaults: customerCrmMapDefaults,
  fields: [
    { handle: 'first_name', label: 'First Name', type: 'string' },
    { handle: 'last_name', label: 'Last Name', type: 'string' },
    { handle: 'email', label: 'Email', type: 'string', isUnique: true },
    { handle: 'phone', label: 'Phone', type: 'string', isUnique: true },
    {
      handle: 'preferred_contact_method',
      label: 'Preferred Contact Method',
      type: 'string',
      options: [
        { value: 'PHONE', label: 'Phone' },
        { value: 'EMAIL', label: 'Email' },
      ],
    },
  ],
})
