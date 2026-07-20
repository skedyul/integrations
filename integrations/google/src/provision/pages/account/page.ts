import { definePage } from 'skedyul'

export default definePage({
  handle: 'account',
  label: 'Account',
  type: 'instance',
  path: '/account',
  default: true,
  navigation: true,

  context: {
    google_connection: {
      tool: 'fetch_google_connection',
    },
    google_app_webhook: {
      model: 'google_app_webhook',
      mode: 'first',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Google Account',
        description: 'View your connected Google account status.',
      },
      form: {
        id: 'google-account-status-form',
        fields: [
          {
            component: 'input',
            id: 'email',
            row: 0,
            col: 0,
            label: 'Account Email',
            leftIcon: 'Mail',
            value: '{{ google_connection.email }}',
            disabled: true,
            helpText: 'Connected Google account email address',
          },
          {
            component: 'input',
            id: 'status',
            row: 1,
            col: 0,
            label: 'Connection Status',
            leftIcon: 'Link',
            value: '{{ google_connection.status }}',
            disabled: true,
            helpText: 'Current status of your Google account connection',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'email', colSpan: 12 }] },
            { columns: [{ field: 'status', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar Push Webhook',
        description: 'Shared callback URL for Google Calendar push notifications.',
      },
      form: {
        id: 'google-webhook-config-form',
        fields: [
          {
            component: 'input',
            id: 'callback_url',
            row: 0,
            col: 0,
            label: 'Callback URL',
            leftIcon: 'Link',
            value: '{{ google_app_webhook.callback_url }}',
            disabled: true,
            helpText: 'Google Calendar watch channels use this Skedyul webhook URL',
          },
          {
            component: 'input',
            id: 'setup_status',
            row: 1,
            col: 0,
            label: 'Setup Status',
            leftIcon: 'Webhook',
            value: '{{ google_app_webhook.setup_status }}',
            disabled: true,
            helpText: 'Whether the calendar push webhook was registered during provision',
          },
          {
            component: 'textarea',
            id: 'notes',
            row: 2,
            col: 0,
            label: 'Setup Notes',
            value: '{{ google_app_webhook.notes }}',
            disabled: true,
            helpText: 'Latest provision notes for webhook configuration',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'callback_url', colSpan: 12 }] },
            { columns: [{ field: 'setup_status', colSpan: 12 }] },
            { columns: [{ field: 'notes', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
