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
      definitionHandle: 'phone',
      visibility: {
        data: true,
        list: true,
        filters: true,
      },
    },
    {
      handle: 'opt_in',
      label: 'Opt In',
      definitionHandle: 'system/opt_in',
      required: false,
      default: ['OPT_IN'],
      visibility: { data: true, list: true, filters: true },
      permissions: { read: true, write: true },
    },
    {
      handle: 'last_contacted_at',
      label: 'Last Contacted At',
      definitionHandle: 'system/last_contacted_at',
      required: false,
      visibility: { data: false, list: true, filters: true },
      permissions: { read: true, write: false },
    },
  ],

  capabilities: {
    messaging: {
      label: 'WhatsApp',
      icon: 'MessageSquare',
      receive: 'receive_whatsapp',
      send: 'send_whatsapp',
    },
  },
})
