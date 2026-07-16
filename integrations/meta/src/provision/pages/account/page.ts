/**
 * Account Page
 *
 * Shows OAuth connection status and account details.
 *
 * Path: /account
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'account',
  label: 'Account',
  type: 'instance',
  path: '/account',
  default: true,
  navigation: true,

  context: {
    meta_connection: {
      tool: 'fetch_meta_connection',
    },
    meta_app_webhook: {
      model: 'meta_app_webhook',
      mode: 'first',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Meta Account',
        description: 'View your connected Meta account status.',
      },
      form: {
        id: 'account-status-form',
        fields: [
          {
            component: 'input',
            id: 'business_name',
            row: 0,
            col: 0,
            label: 'Business Name',
            leftIcon: 'Building2',
            value: '{{ meta_connection.business_name }}',
            disabled: true,
            helpText: 'Your connected Meta business account name',
          },
          {
            component: 'input',
            id: 'status',
            row: 1,
            col: 0,
            label: 'Connection Status',
            leftIcon: 'Link',
            value: '{{ meta_connection.status }}',
            disabled: true,
            helpText: 'Current status of your Meta account connection',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'business_name', colSpan: 12 }] },
            { columns: [{ field: 'status', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Webhook Configuration',
        description:
          'Shared callback URL for WhatsApp, Messenger, and Instagram. Provision configures this in Meta automatically when possible.',
      },
      form: {
        id: 'webhook-config-form',
        fields: [
          {
            component: 'input',
            id: 'callback_url',
            row: 0,
            col: 0,
            label: 'Callback URL',
            leftIcon: 'Link',
            value: '{{ meta_app_webhook.callback_url }}',
            disabled: true,
            helpText:
              'Paste this URL into the Meta App Dashboard if automatic setup did not complete',
          },
          {
            component: 'input',
            id: 'setup_status',
            row: 1,
            col: 0,
            label: 'Setup Status',
            leftIcon: 'Webhook',
            value: '{{ meta_app_webhook.setup_status }}',
            disabled: true,
            helpText: 'Whether Meta app webhook subscriptions were configured during provision',
          },
          {
            component: 'input',
            id: 'dashboard_url',
            row: 2,
            col: 0,
            label: 'Meta Dashboard',
            leftIcon: 'ExternalLink',
            value: '{{ meta_app_webhook.dashboard_url }}',
            disabled: true,
            helpText: 'Open this link to verify or manually configure Meta webhooks',
          },
          {
            component: 'textarea',
            id: 'notes',
            row: 3,
            col: 0,
            label: 'Setup Notes',
            value: '{{ meta_app_webhook.notes }}',
            disabled: true,
            helpText: 'Latest provision result per Meta webhook object',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'callback_url', colSpan: 12 }] },
            { columns: [{ field: 'setup_status', colSpan: 6 }, { field: 'dashboard_url', colSpan: 6 }] },
            { columns: [{ field: 'notes', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
