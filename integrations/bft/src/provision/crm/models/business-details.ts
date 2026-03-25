/**
 * Business Details Model (Internal)
 *
 * Business contact information for BFT club.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'business_details',
  label: 'Business Details',
  labelPlural: 'Business Details',
  labelTemplate: '{{ name }}',
  description: 'Business contact information for BFT club',
  scope: 'internal',

  fields: [
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Business name',
      owner: 'app',
    },
    {
      handle: 'club_id',
      label: 'Club ID',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Parsed club identifier from URL',
      owner: 'app',
    },
    {
      handle: 'address',
      label: 'Address',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Business address',
      owner: 'app',
    },
    {
      handle: 'phone',
      label: 'Phone',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Phone number',
      owner: 'app',
    },
    {
      handle: 'email',
      label: 'Email',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Email address',
      owner: 'app',
    },
    {
      handle: 'website_url',
      label: 'Website URL',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Source website URL',
      owner: 'app',
    },
  ],
})
