/**
 * WhatsApp Channel
 *
 * WhatsApp messaging via Meta Graph API.
 */

import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'whatsapp',
  label: 'WhatsApp',
  icon: 'MessageSquare',

  fields: [
    {
      handle: 'phone',
      label: 'Phone',
      identifier: true,
      definition: 'phone',
      visibility: {
        data: true,
        list: true,
        filters: true,
      },
    },
  ],

  capabilities: {
    messaging: {
      label: 'WhatsApp',
      icon: 'MessageSquare',
      receive: 'receive_meta',
      send: 'send_whatsapp',
    },
  },
})
