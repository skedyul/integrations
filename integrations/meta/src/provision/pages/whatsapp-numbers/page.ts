/**
 * WhatsApp Numbers List Page
 *
 * List view of all WhatsApp phone numbers from the connected WABA.
 *
 * Path: /whatsapp-numbers
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'whatsapp-numbers',
  label: 'WhatsApp Numbers',
  type: 'list',
  path: '/whatsapp-numbers',
  navigation: true,

  context: {
    meta_connection: {
      model: 'meta_connection',
      mode: 'first',
    },
    whatsapp_phone_numbers: {
      model: 'whatsapp_phone_number',
      mode: 'many',
    },
    registered_wa_numbers: {
      tool: 'fetch_registered_wa_business_numbers',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'whatsapp-numbers-list-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'new_whatsapp_number_form',
            row: 0,
            col: 0,
            label: 'WhatsApp Number',
            description: [
              "{%- if meta_connection == blank -%}",
              "Connect your Meta account to add WhatsApp numbers",
              "{%- elsif meta_connection.status != 'connected' -%}",
              "Meta account must be connected before adding WhatsApp numbers",
              "{%- else -%}",
              "Click to add a registered WhatsApp number to your business",
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            button: {
              label: 'Add WhatsApp Number',
              variant: 'outline',
              size: 'sm',
              disabled: [
                "{%- if meta_connection == blank -%}true",
                "{%- elsif meta_connection.status == 'connected' -%}false",
                "{%- else -%}true",
                "{%- endif -%}",
              ].join(''),
            },
            modalForm: {
              header: {
                title: 'Add WhatsApp Number',
                description: 'Select a registered WhatsApp business number to add to your installation.',
              },
              handler: 'add_whatsapp_number',
              fields: [
                {
                  component: 'alert',
                  id: 'meta_connection_info',
                  row: 0,
                  col: 0,
                  title: 'Meta Account',
                  description: [
                    '{{ meta_connection.business_name }} • ',
                    'WABA ID: {{ meta_connection.waba_id }}',
                  ].join(''),
                  icon: 'Building2',
                  variant: 'default',
                },
                {
                  component: 'select',
                  id: 'phone_number_id',
                  row: 1,
                  col: 0,
                  iterable: '{{ registered_wa_numbers }}',
                  itemTemplate: {
                    value: '{{ item.id }}',
                    label: '{{ item.display_phone_number }} ({{ item.verified_name }})',
                  },
                  label: 'WhatsApp Number',
                  placeholder: 'Select a phone number',
                  helpText: 'Choose a registered WhatsApp business number from your Meta account',
                  required: true,
                },
                {
                  component: 'input',
                  id: 'name',
                  row: 2,
                  col: 0,
                  label: 'Display Name',
                  leftIcon: 'Tag',
                  placeholder: 'e.g., Sales Line, Support Number',
                  helpText: 'A friendly name to identify this WhatsApp number',
                  required: false,
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'meta_connection_info', colSpan: 12 }] },
                  { columns: [{ field: 'phone_number_id', colSpan: 12 }] },
                  { columns: [{ field: 'name', colSpan: 12 }] },
                ],
              },
              actions: [
                {
                  handle: 'add_whatsapp_number',
                  label: 'Add WhatsApp Number',
                  handler: 'add_whatsapp_number',
                  icon: 'MessageSquare',
                  variant: 'primary',
                  disabled: [
                    "{%- if meta_connection == blank -%}true",
                    "{%- elsif meta_connection.status == 'connected' -%}false",
                    "{%- else -%}true",
                    "{%- endif -%}",
                  ].join(''),
                },
              ],
            },
          },
          {
            component: 'list',
            id: 'whatsapp_numbers_list',
            row: 1,
            col: 0,
            iterable: '{{ whatsapp_phone_numbers }}',
            itemTemplate: {
              component: 'ActionTile',
              span: 12,
              mdSpan: 12,
              lgSpan: 12,
              props: {
                id: '{{ item.id }}',
                label: '{{ item.phone }}',
                description: '{{ item.display_name }}',
                leftIcon: 'MessageSquare',
                href: '/whatsapp-numbers/{{ item.id }}/overview',
              },
            },
            title: 'WhatsApp Phone Numbers',
            emptyMessage: 'No WhatsApp phone numbers found. Connect your Meta account to get started.',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'new_whatsapp_number_form', colSpan: 12 }] },
            { columns: [{ field: 'whatsapp_numbers_list', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
