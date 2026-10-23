/**
 * WhatsApp Channel
 *
 * WhatsApp messaging via Meta Graph API.
 */

import { defineChannel } from 'skedyul'
import { WHATSAPP_ICON_URL } from './icons'

const whatsapp = defineChannel({
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
    {
      handle: 'opt_in',
      label: 'Opt In',
      definition: 'system/opt_in',
      required: false,
      default: ['OPT_IN'],
      visibility: { data: true, list: true, filters: true },
      permissions: { read: true, write: true },
    },
    {
      handle: 'last_contacted_at',
      label: 'Last Contacted At',
      definition: 'system/last_contacted_at',
      required: false,
      visibility: { data: false, list: true, filters: true },
      permissions: { read: true, write: false },
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

export default Object.assign(whatsapp, { iconUrl: WHATSAPP_ICON_URL })
