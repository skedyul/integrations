/**
 * Enquiry entity — REA enquiry record from app.realestate.enquiry.created.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "enquiry".
 */

import { defineEntity } from 'skedyul'
import { enquiryCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'enquiry',
  label: 'Enquiry',
  labelPlural: 'Enquiries',
  description:
    'Enquiry payload from app.realestate.enquiry.created (REA EnquiryCreated webhooks); many per Lead',
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
    },
    {
      handle: 'comments',
      label: 'Comments',
      type: 'long_string',
    },
    { handle: 'received_at', label: 'REA Received At', type: 'datetime' },
    { handle: 'processed_at', label: 'REA Processed At', type: 'datetime' },
    { handle: 'listing_id', label: 'Listing ID', type: 'string' },
    { handle: 'listing_address', label: 'Listing Address', type: 'string' },
    { handle: 'source', label: 'REA Source', type: 'string' },
  ],
  relationships: [
    {
      handle: 'lead',
      label: 'Lead',
      targetEntity: 'lead',
      description: 'Person/prospect who made this enquiry',
    },
  ],
})
