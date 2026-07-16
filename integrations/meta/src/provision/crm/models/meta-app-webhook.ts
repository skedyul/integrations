/**
 * Meta App Webhook Model
 *
 * App-version level record created during provision. Stores the Skedyul callback
 * URL and Meta subscription status so admins can verify or complete manual setup.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'meta_app_webhook',
  label: 'Meta App Webhook',
  labelPlural: 'Meta App Webhooks',
  labelTemplate: 'Meta Webhook',
  description: 'Shared Meta webhook callback configuration for this app version',
  scope: 'internal',

  fields: [
    {
      handle: 'callback_url',
      label: 'Callback URL',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Skedyul webhook URL registered for receive_meta',
      owner: 'app',
    },
    {
      handle: 'setup_status',
      label: 'Setup Status',
      type: 'string',
      requirement: 'required',
      system: true,
      default: 'pending',
      description: 'Whether Meta app webhook subscriptions were configured automatically',
      owner: 'app',
      definition: {
        limitChoices: 1,
        options: [
          { label: 'Pending', value: 'pending', color: 'yellow' },
          { label: 'Configured', value: 'configured', color: 'green' },
          { label: 'Manual Required', value: 'manual_required', color: 'orange' },
        ],
      },
    },
    {
      handle: 'dashboard_url',
      label: 'Meta Dashboard URL',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Link to configure webhooks in the Meta App Dashboard',
      owner: 'app',
    },
    {
      handle: 'notes',
      label: 'Setup Notes',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Latest provision notes for webhook configuration',
      owner: 'app',
    },
  ],
})
