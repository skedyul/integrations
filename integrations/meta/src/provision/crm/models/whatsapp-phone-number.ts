/**
 * WhatsApp Phone Number Model
 *
 * WhatsApp phone numbers from the connected WABA.
 * Requires a meta connection before provisioning.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'whatsapp_phone_number',
  label: 'WhatsApp Phone Number',
  labelPlural: 'WhatsApp Phone Numbers',
  labelTemplate: '{{ phone }}',
  description: 'WhatsApp phone numbers for messaging',
  scope: 'internal',

  requires: [
    {
      model: 'meta_connection',
      where: { status: { eq: 'connected' } },
    },
  ],

  fields: [
    {
      handle: 'phone',
      label: 'Phone Number',
      type: 'string',
      definition: 'phone',
      requirement: 'required',
      unique: true,
      system: false,
      description: 'The WhatsApp phone number (E.164 format)',
      owner: 'app',
    },
    {
      handle: 'phone_number_id',
      label: 'Phone Number ID',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Meta Graph API phone number ID',
      owner: 'app',
    },
    {
      handle: 'display_name',
      label: 'Display Name',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Display name for this phone number',
      owner: 'app',
    },
    {
      handle: 'quality_rating',
      label: 'Quality Rating',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Meta quality rating for this number',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'A friendly name for this phone number',
      owner: 'shared',
    },
  ],
})
