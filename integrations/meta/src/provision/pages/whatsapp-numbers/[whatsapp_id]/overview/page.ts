/**
 * WhatsApp Number Detail Page - Overview
 *
 * Detail view for a single WhatsApp phone number.
 *
 * Path: /whatsapp-numbers/[whatsapp_id]/overview
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

export default definePage({
  handle: 'whatsapp-number-overview',
  label: 'WhatsApp Number',
  type: 'instance',
  path: '/whatsapp-numbers/[whatsapp_id]/overview',
  navigation,

  context: {
    whatsapp_phone_number: {
      model: 'whatsapp_phone_number',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.whatsapp_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'WhatsApp Number Details',
        description: 'View and manage this WhatsApp phone number.',
      },
      form: {
        id: 'whatsapp-number-detail-form',
        fields: [
          {
            component: 'input',
            id: 'phone',
            row: 0,
            col: 0,
            label: 'Phone Number',
            leftIcon: 'Phone',
            value: '{{ whatsapp_phone_number.phone }}',
            disabled: true,
            helpText: 'Your WhatsApp business phone number (read-only)',
          },
          {
            component: 'input',
            id: 'display_name',
            row: 1,
            col: 0,
            label: 'Display Name',
            leftIcon: 'Building2',
            value: '{{ whatsapp_phone_number.display_name }}',
            disabled: true,
            helpText: 'Business display name from Meta (read-only)',
          },
          {
            component: 'input',
            id: 'quality_rating',
            row: 2,
            col: 0,
            label: 'Quality Rating',
            leftIcon: 'Star',
            value: '{{ whatsapp_phone_number.quality_rating }}',
            disabled: true,
            helpText: 'Meta quality rating based on message delivery and user feedback',
          },
          {
            component: 'input',
            id: 'name',
            row: 3,
            col: 0,
            label: 'Friendly Name',
            leftIcon: 'Tag',
            value: '{{ whatsapp_phone_number.name }}',
            placeholder: 'e.g., Sales Line, Support Number',
            helpText: 'A custom name to help identify this WhatsApp number',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'phone', colSpan: 12 }] },
            { columns: [{ field: 'display_name', colSpan: 12 }] },
            { columns: [{ field: 'quality_rating', colSpan: 12 }] },
            { columns: [{ field: 'name', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Danger Zone',
        description: 'Irreversible actions for this WhatsApp number.',
      },
      form: {
        id: 'whatsapp-danger-zone-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'remove_whatsapp_number',
            row: 0,
            col: 0,
            label: 'Remove WhatsApp Number',
            description: 'Remove this number and its messaging channel from Skedyul.',
            mode: 'setting',
            button: {
              label: 'Remove',
              variant: 'destructive',
            },
            modalForm: {
              header: {
                title: 'Remove WhatsApp Number',
                description: 'This action cannot be undone.',
              },
              handler: 'remove_whatsapp_number',
              fields: [
                {
                  component: 'alert',
                  id: 'warning',
                  row: 0,
                  col: 0,
                  title: 'Are you sure?',
                  description: [
                    'Removing {{ whatsapp_phone_number.phone }} will:',
                    '',
                    '• Delete the WhatsApp channel and subscriptions',
                    '• Remove this number from your Meta app installation',
                    '',
                    'Message history will be preserved. Reconnect Meta OAuth to add the number again.',
                  ].join('\n'),
                  variant: 'destructive',
                  icon: 'AlertTriangle',
                },
                {
                  component: 'input',
                  id: 'whatsapp_phone_number_id',
                  row: 1,
                  col: 0,
                  type: 'hidden',
                  value: '{{ whatsapp_phone_number.id }}',
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'warning', colSpan: 12 }] },
                  { columns: [{ field: 'whatsapp_phone_number_id', colSpan: 0 }] },
                ],
              },
              actions: [
                {
                  handle: 'remove_whatsapp_number',
                  label: 'Remove WhatsApp Number',
                  handler: 'remove_whatsapp_number',
                  icon: 'Trash2',
                  variant: 'destructive',
                },
              ],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'remove_whatsapp_number', colSpan: 12 }] }],
        },
      },
    },
  ],
})
