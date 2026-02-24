/**
 * Phone Numbers List Page
 *
 * List view of all provisioned phone numbers.
 *
 * Path: /phone-numbers
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'phone-numbers',
  label: 'Phone Numbers',
  type: 'list',
  path: '/phone-numbers',
  navigation: true,

  context: {
    compliance_record: {
      model: 'compliance_record',
      mode: 'first',
    },
    phone_numbers: {
      model: 'phone_number',
      mode: 'many',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'new-phone-number-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'new_phone_number_form',
            row: 0,
            col: 0,
            label: 'Phone Number',
            description: [
              "{%- if compliance_record == blank -%}",
              "Submit compliance documents before purchasing a phone number",
              "{%- elsif compliance_record.status != 'approved' -%}",
              "Compliance must be approved before purchasing a phone number",
              "{%- else -%}",
              "Click to purchase a new phone number for your business",
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            button: {
              label: 'Purchase New Number',
              variant: 'outline',
              size: 'sm',
              disabled: [
                "{%- if compliance_record == blank -%}true",
                "{%- elsif compliance_record.status == 'approved' -%}false",
                "{%- else -%}true",
                "{%- endif -%}",
              ].join(''),
            },
            modalForm: {
              header: {
                title: 'New Phone Number',
                description: 'Request a new phone number for your business.',
              },
              handler: 'submit_new_phone_number',
              fields: [
                {
                  component: 'alert',
                  id: 'compliance_record_info',
                  row: 0,
                  col: 0,
                  title: 'Compliance',
                  description: [
                    '{{ compliance_record.business_name }} • ',
                    'ABN: {{ compliance_record.business_id }} • ',
                    '{{ compliance_record.address }}, {{ compliance_record.country }}',
                  ].join(''),
                  icon: 'Building2',
                  variant: 'default',
                },
                {
                  component: 'input',
                  id: 'name',
                  row: 1,
                  col: 0,
                  label: 'Phone Name',
                  placeholder: 'e.g., Sales Line, Support Number',
                  helpText: 'A friendly name to identify this phone number',
                  required: false,
                },
                {
                  component: 'input',
                  id: 'compliance_record',
                  row: 2,
                  col: 0,
                  type: 'hidden',
                  value: '{{ compliance_record.id }}',
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'compliance_record_info', colSpan: 12 }] },
                  { columns: [{ field: 'name', colSpan: 12 }] },
                  { columns: [{ field: 'compliance_record', colSpan: 0 }] },
                ],
              },
              actions: [
                {
                  handle: 'submit_new_phone_number',
                  label: 'Purchase Phone Number',
                  handler: 'submit_new_phone_number',
                  icon: 'Phone',
                  variant: 'primary',
                  disabled: [
                    "{%- if compliance_record == blank -%}true",
                    "{%- elsif compliance_record.status == 'approved' -%}false",
                    "{%- else -%}true",
                    "{%- endif -%}",
                  ].join(''),
                },
              ],
            },
          },
          {
            component: 'list',
            id: 'phone_numbers_list',
            row: 1,
            col: 0,
            iterable: '{{ phone_numbers }}',
            itemTemplate: {
              component: 'ActionTile',
              span: 12,
              mdSpan: 12,
              lgSpan: 12,
              props: {
                id: '{{ item.id }}',
                label: '{{ item.phone }}',
                description: '{{ item.forwarding_phone_number }}',
                leftIcon: 'Phone',
                href: '/phone-numbers/{{ item.id }}/overview',
              },
            },
            title: 'Phone Numbers',
            emptyMessage: 'No phone numbers registered yet.',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'new_phone_number_form', colSpan: 12 }] },
            { columns: [{ field: 'phone_numbers_list', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
