/**
 * Lead entity — person/prospect from REA enquiry contact details.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "lead".
 */

import { defineEntity } from 'skedyul'
import { leadCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'lead',
  label: 'Lead',
  labelPlural: 'Leads',
  description:
    'Person/prospect from app.realestate.enquiry.created contact details (create-or-find; linked from Enquiry)',
  crmMapDefaults: leadCrmMapDefaults,
  fields: [
    { handle: 'first_name', label: 'First Name', type: 'string' },
    { handle: 'last_name', label: 'Last Name', type: 'string' },
    { handle: 'email', label: 'Email', type: 'string', isUnique: true },
    { handle: 'phone', label: 'Phone', type: 'string', isUnique: true },
    { handle: 'postcode', label: 'Postcode', type: 'string' },
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
