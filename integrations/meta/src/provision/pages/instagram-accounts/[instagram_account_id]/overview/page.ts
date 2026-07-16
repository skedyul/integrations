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
  ],
})
