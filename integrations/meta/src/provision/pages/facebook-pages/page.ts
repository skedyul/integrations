/**
 * Facebook Pages List Page
 *
 * Path: /facebook-pages
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'facebook-pages',
  label: 'Facebook Pages',
  type: 'list',
  path: '/facebook-pages',
  navigation: true,

  context: {
    meta_connection: {
      tool: 'fetch_meta_connection',
    },
    facebook_pages: {
      model: 'facebook_page',
      mode: 'many',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'facebook-pages-list-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'new_facebook_page_form',
            row: 0,
            col: 0,
            label: 'Facebook Page',
            description: [
              "{%- if meta_connection.status != 'connected' -%}",
              'Connect your Meta account to add Facebook Pages',
              "{%- else -%}",
              'Add a connected Facebook Page as a Messenger channel',
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            button: {
              label: 'Add Facebook Page',
              variant: 'outline',
              size: 'sm',
              disabled: "{%- if meta_connection.status == 'connected' -%}false{%- else -%}true{%- endif -%}",
            },
            modalForm: {
              header: {
                title: 'Add Facebook Page',
                description: 'Select a Facebook Page to enable Messenger messaging.',
              },
              handler: 'add_facebook_page',
              fields: [
                {
                  component: 'select',
                  id: 'page_id',
                  row: 0,
                  col: 0,
                  iterable: '{{ facebook_pages }}',
                  itemTemplate: {
                    value: '{{ item.page_id }}',
                    label: '{{ item.name }}',
                  },
                  label: 'Facebook Page',
                  placeholder: 'Select a page',
                  required: true,
                },
                {
                  component: 'input',
                  id: 'name',
                  row: 1,
                  col: 0,
                  label: 'Display Name',
                  leftIcon: 'Tag',
                  placeholder: 'e.g., Support Page',
                  required: false,
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'page_id', colSpan: 12 }] },
                  { columns: [{ field: 'name', colSpan: 12 }] },
                ],
              },
              actions: [
                {
                  handle: 'add_facebook_page',
                  label: 'Add Facebook Page',
                  handler: 'add_facebook_page',
                  icon: 'MessageCircle',
                  variant: 'primary',
                },
              ],
            },
          },
          {
            component: 'list',
            id: 'facebook_pages_list',
            row: 1,
            col: 0,
            iterable: '{{ facebook_pages }}',
            itemTemplate: {
              component: 'ActionTile',
              span: 12,
              mdSpan: 12,
              lgSpan: 12,
              props: {
                id: '{{ item.id }}',
                label: '{{ item.name }}',
                description: 'Page ID: {{ item.page_id }}',
                leftIcon: 'MessageCircle',
                href: '/facebook-pages/{{ item.id }}/overview',
              },
            },
            title: 'Facebook Pages',
            emptyMessage: 'No Facebook Pages found. Connect your Meta account to get started.',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'new_facebook_page_form', colSpan: 12 }] },
            { columns: [{ field: 'facebook_pages_list', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
