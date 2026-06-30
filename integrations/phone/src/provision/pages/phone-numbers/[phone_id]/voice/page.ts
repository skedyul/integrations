/**
 * Phone Number Detail Page - Voice
 *
 * Path: /phone-numbers/[phone_id]/voice
 */

import { definePage } from 'skedyul'
import navigation from '../navigation'

export default definePage({
  handle: 'phone-number-voice',
  label: 'Voice',
  type: 'instance',
  path: '/phone-numbers/[phone_id]/voice',
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
        title: 'Voice Settings',
        description: 'Configure call settings for this phone number.',
      },
      form: {
        id: 'voice-settings-form',
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
