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
            value: '{{ whatsapp_phone_number.phone }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'display_name',
            row: 1,
            col: 0,
            label: 'Display Name',
            value: '{{ whatsapp_phone_number.display_name }}',
            disabled: true,
            helpText: 'Display name from Meta (read-only)',
          },
          {
            component: 'input',
            id: 'quality_rating',
            row: 2,
            col: 0,
            label: 'Quality Rating',
            value: '{{ whatsapp_phone_number.quality_rating }}',
            disabled: true,
            helpText: 'Meta quality rating for this number (read-only)',
          },
          {
            component: 'input',
            id: 'name',
            row: 3,
            col: 0,
            label: 'Name',
            value: '{{ whatsapp_phone_number.name }}',
            placeholder: 'Enter a friendly name for this number',
            helpText: 'A friendly name to identify this WhatsApp number',
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
  ],
})
