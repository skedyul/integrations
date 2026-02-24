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
      definitionHandle: 'phone',
      required: true,
      unique: true,
      system: false,
      description: 'The WhatsApp phone number (E.164 format)',
      owner: 'app',
    },
    {
      handle: 'phone_number_id',
      label: 'Phone Number ID',
      type: 'string',
      required: true,
      system: true,
      description: 'Meta Graph API phone number ID',
      owner: 'app',
    },
    {
      handle: 'display_name',
      label: 'Display Name',
      type: 'string',
      required: false,
      system: true,
      description: 'Display name for this phone number',
      owner: 'app',
    },
    {
      handle: 'quality_rating',
      label: 'Quality Rating',
      type: 'string',
      required: false,
      system: true,
      description: 'Meta quality rating for this number',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      required: false,
      system: false,
      description: 'A friendly name for this phone number',
      owner: 'workplace',
    },
  ],
})
