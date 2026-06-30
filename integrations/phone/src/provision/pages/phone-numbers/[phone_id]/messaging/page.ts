/**
 * Phone Number Detail Page - Messaging
 *
 * Path: /phone-numbers/[phone_id]/messaging
 */

import { definePage } from 'skedyul'
import navigation from '../navigation'

export default definePage({
  handle: 'phone-number-messaging',
  label: 'Messaging',
  type: 'instance',
  path: '/phone-numbers/[phone_id]/messaging',
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
        title: 'Messaging Settings',
        description: 'Configure messaging settings for this phone number.',
      },
      form: {
        id: 'messaging-settings-form',
        fields: [
          {
            component: 'input',
            id: 'phone',
            row: 0,
            col: 0,
            label: 'Phone Number',
            leftIcon: 'Phone',
            value: '{{ phone_number.phone }}',
            disabled: true,
            helpText: 'Your provisioned phone number (read-only)',
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'phone', colSpan: 12 }] }],
        },
      },
    },
  ],
})
