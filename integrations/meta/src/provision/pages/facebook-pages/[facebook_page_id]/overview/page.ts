/**
 * Facebook Page Detail Page
 *
 * Path: /facebook-pages/[id]/overview
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

export default definePage({
  handle: 'facebook-page-overview',
  label: 'Facebook Page',
  type: 'instance',
  path: '/facebook-pages/[facebook_page_id]/overview',
  navigation,

  context: {
    facebook_page: {
      model: 'facebook_page',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.facebook_page_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Facebook Page Details',
        description: 'View this connected Facebook Page.',
      },
      form: {
        id: 'facebook-page-detail-form',
        fields: [
          {
            component: 'input',
            id: 'name',
            row: 0,
            col: 0,
            label: 'Page Name',
            leftIcon: 'MessageCircle',
            value: '{{ facebook_page.name }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'page_id',
            row: 1,
            col: 0,
            label: 'Page ID',
            value: '{{ facebook_page.page_id }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'category',
            row: 2,
            col: 0,
            label: 'Category',
            value: '{{ facebook_page.category }}',
            disabled: true,
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'name', colSpan: 12 }] },
            { columns: [{ field: 'page_id', colSpan: 12 }] },
            { columns: [{ field: 'category', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Danger Zone',
        description: 'Irreversible actions for this Facebook Page.',
      },
      form: {
        id: 'facebook-page-danger-zone-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'remove_facebook_page',
            row: 0,
            col: 0,
            label: 'Remove Facebook Page',
            description: 'Remove this page and its Messenger channel from Skedyul.',
            mode: 'setting',
            button: {
              label: 'Remove',
              variant: 'destructive',
            },
            modalForm: {
              header: {
                title: 'Remove Facebook Page',
                description: 'This action cannot be undone.',
              },
              handler: 'remove_facebook_page',
              fields: [
                {
                  component: 'alert',
                  id: 'warning',
                  row: 0,
                  col: 0,
                  title: 'Are you sure?',
                  description: [
                    'Removing {{ facebook_page.name }} will:',
                    '',
                    '• Delete the Messenger channel and subscriptions',
                    '• Remove this page from your Meta app installation',
                    '',
                    'Message history will be preserved. Reconnect Meta OAuth to add the page again.',
                  ].join('\n'),
                  variant: 'destructive',
                  icon: 'AlertTriangle',
                },
                {
                  component: 'input',
                  id: 'facebook_page_id',
                  row: 1,
                  col: 0,
                  type: 'hidden',
                  value: '{{ facebook_page.id }}',
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'warning', colSpan: 12 }] },
                  { columns: [{ field: 'facebook_page_id', colSpan: 0 }] },
                ],
              },
              actions: [
                {
                  handle: 'remove_facebook_page',
                  label: 'Remove Facebook Page',
                  handler: 'remove_facebook_page',
                  icon: 'Trash2',
                  variant: 'destructive',
                },
              ],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'remove_facebook_page', colSpan: 12 }] }],
        },
      },
    },
  ],
})
