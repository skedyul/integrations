/**
 * Phone Number Detail Page - Overview
 *
 * Detail view for a single phone number.
 *
 * Path: /phone-numbers/[phone_id]/overview
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

export default definePage({
  handle: 'phone-number-overview',
  label: 'Phone Number',
  type: 'instance',
  path: '/phone-numbers/[phone_id]/overview',
  navigation,

  context: {
    phone_number: {
      model: 'phone_number',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.phone_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Phone Number Details',
        description: 'View and manage this phone number.',
      },
      form: {
        id: 'phone-number-detail-form',
        fields: [
          {
            component: 'input',
            id: 'phone',
            row: 0,
            col: 0,
            label: 'Phone Number',
            value: '{{ phone_number.phone }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'name',
            row: 1,
            col: 0,
            label: 'Name',
            value: '{{ phone_number.name }}',
            placeholder: 'Enter a friendly name for this number',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'phone', colSpan: 12 }] },
            { columns: [{ field: 'name', colSpan: 12 }] },
          ],
        },
        actions: [
          {
            handle: 'save_phone_details',
            label: 'Save',
            handler: 'update_phone_details',
            variant: 'primary',
          },
        ],
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Danger Zone',
        description: 'Irreversible actions for this phone number.',
      },
      form: {
        id: 'danger-zone-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'remove_phone_number',
            row: 0,
            col: 0,
            label: 'Remove Phone Number',
            description: 'Permanently remove this phone number from your account.',
            mode: 'setting',
            button: {
              label: 'Remove',
              variant: 'destructive',
            },
            modalForm: {
              header: {
                title: 'Remove Phone Number',
                description: 'This action cannot be undone.',
              },
              handler: 'remove_phone_number',
              fields: [
                {
                  component: 'alert',
                  id: 'warning',
                  row: 0,
                  col: 0,
                  title: 'Are you sure?',
                  description: [
                    'Removing {{ phone_number.phone }} will:',
                    '',
                    '• Delete the SMS channel and all subscriptions',
                    '• Disconnect contacts from this channel',
                    '',
                    'Message history will be preserved. The Twilio number will be retained for potential transfer.',
                  ].join('\n'),
                  variant: 'destructive',
                  icon: 'AlertTriangle',
                },
                {
                  component: 'input',
                  id: 'phone_number_id',
                  row: 1,
                  col: 0,
                  type: 'hidden',
                  value: '{{ phone_number.id }}',
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'warning', colSpan: 12 }] },
                  { columns: [{ field: 'phone_number_id', colSpan: 0 }] },
                ],
              },
              actions: [
                {
                  handle: 'remove_phone_number',
                  label: 'Remove Phone Number',
                  handler: 'remove_phone_number',
                  icon: 'Trash2',
                  variant: 'destructive',
                },
              ],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'remove_phone_number', colSpan: 12 }] }],
        },
      },
    },
  ],
})
