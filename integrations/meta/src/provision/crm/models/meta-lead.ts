/**
 * Meta Lead
 *
 * Lead Ads / instant form submission. This is a CRM record, not a chat message.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'meta_lead',
  label: 'Meta Lead',
  labelPlural: 'Meta Leads',
  labelTemplate: '{{ full_name }}',
  description: 'Lead Ads and instant form submissions',
  scope: 'internal',

  fields: [
    {
      handle: 'leadgen_id',
      label: 'Lead ID',
      type: 'string',
      requirement: 'required',
      unique: true,
      system: true,
      owner: 'app',
    },
    {
      handle: 'form_id',
      label: 'Form ID',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'ad_id',
      label: 'Ad ID',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'page_id',
      label: 'Page ID',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'full_name',
      label: 'Name',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'email',
      label: 'Email',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'phone',
      label: 'Phone',
      type: 'string',
      definition: 'phone',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
    {
      handle: 'field_data',
      label: 'Field Data',
      type: 'object',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
  ],
})
