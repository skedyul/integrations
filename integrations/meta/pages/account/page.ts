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
      model: 'meta_connection',
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
            value: '{{ meta_connection.business_name }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'status',
            row: 1,
            col: 0,
            label: 'Status',
            value: '{{ meta_connection.status }}',
            disabled: true,
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
  ],
})
