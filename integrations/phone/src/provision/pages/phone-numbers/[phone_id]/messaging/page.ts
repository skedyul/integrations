/**
 * Phone Number Detail Page - Messaging
 *
 * Messaging configuration for this phone number.
 *
 * Path: /phone-numbers/[phone_id]/messaging
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

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
        fields: [],
        layout: {
          type: 'form',
          rows: [],
        },
      },
    },
  ],
})
