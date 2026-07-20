import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'google_app_webhook',
  label: 'Google App Webhook',
  labelPlural: 'Google App Webhooks',
  labelTemplate: 'Google Webhook',
  description: 'Shared Google Calendar push webhook callback for this app version',
  scope: 'internal',

  fields: [
    {
      handle: 'callback_url',
      label: 'Callback URL',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Skedyul webhook URL registered for calendar_push',
      owner: 'app',
    },
    {
      handle: 'setup_status',
      label: 'Setup Status',
      type: 'string',
      requirement: 'required',
      system: true,
      default: 'pending',
      description: 'Whether the calendar push webhook was registered during provision',
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
