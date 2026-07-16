/**
 * Instagram Account Detail Page
 *
 * Path: /instagram-accounts/[id]/overview
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

export default definePage({
  handle: 'instagram-account-overview',
  label: 'Instagram Account',
  type: 'instance',
  path: '/instagram-accounts/[instagram_account_id]/overview',
  navigation,

  context: {
    instagram_account: {
      model: 'instagram_account',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.instagram_account_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Instagram Account Details',
        description: 'View this Instagram Business account.',
      },
      form: {
        id: 'instagram-account-detail-form',
        fields: [
          {
            component: 'input',
            id: 'username',
            row: 0,
            col: 0,
            label: 'Username',
            leftIcon: 'Instagram',
            value: '@{{ instagram_account.username }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'name',
            row: 1,
            col: 0,
            label: 'Display Name',
            value: '{{ instagram_account.name }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'instagram_account_id',
            row: 2,
            col: 0,
            label: 'Account ID',
            value: '{{ instagram_account.instagram_account_id }}',
            disabled: true,
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'username', colSpan: 12 }] },
            { columns: [{ field: 'name', colSpan: 12 }] },
            { columns: [{ field: 'instagram_account_id', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Danger Zone',
        description: 'Irreversible actions for this Instagram account.',
      },
      form: {
        id: 'instagram-account-danger-zone-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'remove_instagram_account',
            row: 0,
            col: 0,
            label: 'Remove Instagram Account',
            description: 'Remove this account and its Direct messaging channel from Skedyul.',
            mode: 'setting',
            button: {
              label: 'Remove',
              variant: 'destructive',
            },
            modalForm: {
              header: {
                title: 'Remove Instagram Account',
                description: 'This action cannot be undone.',
              },
              handler: 'remove_instagram_account',
              fields: [
                {
                  component: 'alert',
                  id: 'warning',
                  row: 0,
                  col: 0,
                  title: 'Are you sure?',
                  description: [
                    'Removing @{{ instagram_account.username }} will:',
                    '',
                    '• Delete the Instagram channel and subscriptions',
                    '• Remove this account from your Meta app installation',
                    '',
                    'Message history will be preserved. Reconnect Meta OAuth to add the account again.',
                  ].join('\n'),
                  variant: 'destructive',
                  icon: 'AlertTriangle',
                },
                {
                  component: 'input',
                  id: 'instance_id',
                  row: 1,
                  col: 0,
                  type: 'hidden',
                  value: '{{ instagram_account.id }}',
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'warning', colSpan: 12 }] },
                  { columns: [{ field: 'instance_id', colSpan: 0 }] },
                ],
              },
              actions: [
                {
                  handle: 'remove_instagram_account',
                  label: 'Remove Instagram Account',
                  handler: 'remove_instagram_account',
                  icon: 'Trash2',
                  variant: 'destructive',
                },
              ],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'remove_instagram_account', colSpan: 12 }] }],
        },
      },
    },
  ],
})
