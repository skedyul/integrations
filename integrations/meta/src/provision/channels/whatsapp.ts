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
      // Free-form messages only within 24h of the customer's last message.
      // Outside it the platform sends an approved template it creates here.
      window: { hours: 24 },
      templates: {
        create: 'create_whatsapp_template',
        delete: 'delete_whatsapp_template',
      },
    },
  },
})
