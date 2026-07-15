/**
 * Lead Model (Shared)
 *
 * Leads synced from realestate.com.au enquiries. Mapped to workplace CRM models
 * during installation.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'lead',
  label: 'Lead',
  labelPlural: 'Leads',
  labelTemplate: '{{ first_name }} {{ last_name }}',
  description: 'Leads synced from realestate.com.au enquiries',
  scope: 'shared',
  fields: [
    {
      handle: 'rea_enquiry_id',
      label: 'REA Enquiry ID',
      type: 'string',
      unique: true,
      system: true,
      owner: 'app',
      description: 'Unique enquiry identifier from REA (upsert key)',
    },
    {
      handle: 'first_name',
      label: 'First Name',
      type: 'string',
    },
    {
      handle: 'last_name',
      label: 'Last Name',
      type: 'string',
    },
    {
      handle: 'email',
      label: 'Email',
      type: 'string',
      definition: 'email',
    },
    {
      handle: 'phone',
      label: 'Phone',
      type: 'string',
      definition: 'phone',
    },
    {
      handle: 'postcode',
      label: 'Postcode',
      type: 'string',
    },
    {
      handle: 'rea_agency_id',
      label: 'REA Agency ID',
      type: 'string',
      owner: 'app',
      description: 'REA agency identifier (6-letter code)',
    },
    {
      handle: 'enquiry_type',
      label: 'Enquiry Type',
      type: 'string',
      owner: 'app',
      description: 'REA enquiry type (e.g. REALESTATE_COM_AU_LISTING)',
    },
    {
      handle: 'comments',
      label: 'Comments',
      type: 'long_string',
      owner: 'app',
      description: 'Enquirer free-form comments from REA',
    },
    {
      handle: 'received_at',
      label: 'REA Received At',
      type: 'datetime',
      owner: 'app',
      description: 'When REA received the enquiry',
    },
    {
      handle: 'processed_at',
      label: 'REA Processed At',
      type: 'datetime',
      owner: 'app',
      description: 'When REA processed the enquiry',
    },
    {
      handle: 'preferred_contact_method',
      label: 'Preferred Contact Method',
      type: 'string',
      owner: 'app',
      definition: {
        limitChoices: 1,
        options: [
          { value: 'PHONE', label: 'Phone' },
          { value: 'EMAIL', label: 'Email' },
        ],
      },
    },
    {
      handle: 'listing_id',
      label: 'Listing ID',
      type: 'string',
      owner: 'app',
      description: 'REA listing identifier related to the enquiry',
    },
    {
      handle: 'listing_address',
      label: 'Listing Address',
      type: 'string',
      owner: 'app',
      description: 'Address of the listing related to the enquiry',
    },
    {
      handle: 'source',
      label: 'REA Source',
      type: 'string',
      owner: 'app',
      description: 'Campaign source metadata from REA (name/type)',
    },
  ],
})
