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
  ],
})
