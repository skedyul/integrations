/**
 * Enquiry entity — REA enquiry row (not the person or listing).
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "enquiry".
 */

import { defineEntity } from 'skedyul'
import { REA_ENQUIRY_TYPE_OPTIONS } from '../../lib/rea-enquiry-types'
import { enquiryCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'enquiry',
  label: 'Enquiry',
  labelPlural: 'Enquiries',
  description:
    'Enquiry payload from app.realestate.enquiry.created (REA EnquiryCreated webhooks)',
  crmMapDefaults: enquiryCrmMapDefaults,
  fields: [
    {
      handle: 'rea_enquiry_id',
      label: 'REA Enquiry ID',
      type: 'string',
      isUnique: true,
      required: true,
    },
    {
      handle: 'rea_agency_id',
      label: 'REA Agency ID',
      type: 'string',
      required: true,
    },
    {
      handle: 'enquiry_type',
      label: 'Enquiry Type',
      type: 'string',
      options: REA_ENQUIRY_TYPE_OPTIONS,
    },
    { handle: 'comments', label: 'Comments', type: 'long_string' },
    { handle: 'source', label: 'REA Source', type: 'string' },
    { handle: 'received_at', label: 'REA Received At', type: 'datetime' },
    { handle: 'processed_at', label: 'REA Processed At', type: 'datetime' },
    {
      handle: 'postcode',
      label: 'Postcode',
      type: 'string',
      description: "Enquirer's postcode, not the listing postcode",
    },
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
  relationships: [
    { handle: 'customer', label: 'Customer', targetEntity: 'customer' },
    { handle: 'property', label: 'Property', targetEntity: 'property' },
  ],
})
