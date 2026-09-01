/**
 * Lead entity — REA enquiry payload from app.realestate.enquiry.created.
 * Mapped to workplace CRM at install; workflows apply via | realestate: "format", "lead".
 */

import { defineEntity } from 'skedyul'

export default defineEntity({
  handle: 'lead',
  label: 'Lead',
  labelPlural: 'Leads',
  description:
    'Enquiry payload from app.realestate.enquiry.created (REA EnquiryCreated webhooks)',
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
    { handle: 'first_name', label: 'First Name', type: 'string' },
    { handle: 'last_name', label: 'Last Name', type: 'string' },
    { handle: 'email', label: 'Email', type: 'string', isUnique: true },
    { handle: 'phone', label: 'Phone', type: 'string', isUnique: true },
    { handle: 'postcode', label: 'Postcode', type: 'string' },
    {
      handle: 'enquiry_type',
      label: 'Enquiry Type',
      type: 'string',
    },
    {
      handle: 'lead_type',
      label: 'Lead Type',
      type: 'string',
      options: [
        { value: 'vendor', label: 'Vendor' },
        { value: 'buyer', label: 'Buyer' },
        { value: 'landlord', label: 'Landlord' },
        { value: 'tenant', label: 'Tenant' },
        { value: 'prospect', label: 'Prospect' },
      ],
    },
    {
      handle: 'comments',
      label: 'Comments',
      type: 'long_string',
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
    { handle: 'received_at', label: 'REA Received At', type: 'datetime' },
    { handle: 'processed_at', label: 'REA Processed At', type: 'datetime' },
    { handle: 'listing_id', label: 'Listing ID', type: 'string' },
    { handle: 'listing_address', label: 'Listing Address', type: 'string' },
    { handle: 'source', label: 'REA Source', type: 'string' },
  ],
})
