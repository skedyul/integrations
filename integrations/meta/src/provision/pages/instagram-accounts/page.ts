/**
 * Instagram Accounts List Page
 *
 * Path: /instagram-accounts
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'instagram-accounts',
  label: 'Instagram Accounts',
  type: 'list',
  path: '/instagram-accounts',
  navigation: true,

  context: {
    meta_connection: {
      tool: 'fetch_meta_connection',
    },
    instagram_accounts: {
      model: 'instagram_account',
      mode: 'many',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'instagram-accounts-list-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'new_instagram_account_form',
            row: 0,
            col: 0,
            label: 'Instagram Account',
            description: [
              "{%- if meta_connection.status != 'connected' -%}",
              'Connect your Meta account to add Instagram accounts',
              "{%- else -%}",
              'Add a connected Instagram Business account as a Direct messaging channel',
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            button: {
              label: 'Add Instagram Account',
              variant: 'outline',
              size: 'sm',
              disabled: "{%- if meta_connection.status == 'connected' -%}false{%- else -%}true{%- endif -%}",
            },
            modalForm: {
              header: {
                title: 'Add Instagram Account',
                description: 'Select an Instagram Business account for Direct messaging.',
              },
              handler: 'add_instagram_account',
              fields: [
                {
                  component: 'select',
                  id: 'instagram_account_id',
                  row: 0,
                  col: 0,
                  iterable: '{{ instagram_accounts }}',
                  itemTemplate: {
                    value: '{{ item.instagram_account_id }}',
                    label: '@{{ item.username }}',
                  },
                  label: 'Instagram Account',
                  placeholder: 'Select an account',
                  required: true,
                },
                {
                  component: 'input',
                  id: 'name',
                  row: 1,
                  col: 0,
                  label: 'Display Name',
                  leftIcon: 'Tag',
                  placeholder: 'e.g., Brand Instagram',
                  required: false,
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'instagram_account_id', colSpan: 12 }] },
                  { columns: [{ field: 'name', colSpan: 12 }] },
                ],
              },
              actions: [
                {
                  handle: 'add_instagram_account',
                  label: 'Add Instagram Account',
                  handler: 'add_instagram_account',
                  icon: 'Instagram',
                  variant: 'primary',
                },
              ],
            },
          },
          {
            component: 'list',
            id: 'instagram_accounts_list',
            row: 1,
            col: 0,
            iterable: '{{ instagram_accounts }}',
            itemTemplate: {
              component: 'ActionTile',
              span: 12,
              mdSpan: 12,
              lgSpan: 12,
              props: {
                id: '{{ item.id }}',
                label: '@{{ item.username }}',
                description: '{{ item.name }}',
                leftIcon: 'Instagram',
                href: '/instagram-accounts/{{ item.id }}/overview',
              },
            },
            title: 'Instagram Accounts',
            emptyMessage: 'No Instagram accounts found. Connect your Meta account to get started.',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'new_instagram_account_form', colSpan: 12 }] },
            { columns: [{ field: 'instagram_accounts_list', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
