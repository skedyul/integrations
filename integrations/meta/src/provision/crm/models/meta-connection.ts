/**
 * Meta Connection Model
 *
 * Top-level model representing the OAuth connection to Meta.
 * One per installation. Created during OAuth callback.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'meta_connection',
  label: 'Meta Connection',
  labelPlural: 'Meta Connections',
  labelTemplate: '{{ business_name || "Meta Connection" }}',
  description: 'OAuth connection to Meta (WhatsApp Business Account, Facebook Pages, Instagram)',
  scope: 'internal',

  fields: [
    {
      handle: 'waba_id',
      label: 'WhatsApp Business Account ID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Meta WhatsApp Business Account ID',
      owner: 'app',
    },
    {
      handle: 'business_name',
      label: 'Business Name',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Business name from Meta account',
      owner: 'app',
    },
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      requirement: 'required',
      system: true,
      default: 'pending',
      description: 'Connection status of the Meta account',
      owner: 'app',
      definition: {
        limitChoices: 1,
        options: [
          { label: 'Pending', value: 'pending', color: 'yellow' },
          { label: 'Connected', value: 'connected', color: 'green' },
          { label: 'Error', value: 'error', color: 'red' },
        ],
      },
    },
  ],
})
