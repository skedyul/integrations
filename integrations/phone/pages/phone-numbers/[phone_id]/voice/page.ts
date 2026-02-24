/**
 * Phone Number Detail Page - Voice
 *
 * Voice/call forwarding configuration for this phone number.
 *
 * Path: /phone-numbers/[phone_id]/voice
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

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
        description: 'Configure call forwarding for this phone number.',
      },
      form: {
        id: 'voice-settings-form',
        fields: [
          {
            component: 'input',
            id: 'forwarding_phone_number',
            row: 0,
            col: 0,
            label: 'Call Forwarding Number',
            value: '{{ phone_number.forwarding_phone_number }}',
            placeholder: 'Enter the number to forward calls to',
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'forwarding_phone_number', colSpan: 12 }] }],
        },
        actions: [
          {
            handle: 'save_forwarding_number',
            label: 'Save',
            handler: 'update_forwarding_number',
            variant: 'primary',
          },
        ],
      },
    },
  ],
})
