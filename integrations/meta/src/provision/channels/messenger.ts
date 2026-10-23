/**
 * Messenger Channel
 *
 * Facebook Messenger messaging via Meta Graph API.
 */

import { defineChannel } from 'skedyul'
import { MESSENGER_ICON_URL } from './icons'

export default defineChannel({
  handle: 'messenger',
  label: 'Messenger',
  icon: 'MessageCircle',
  iconUrl: MESSENGER_ICON_URL,

  fields: [
    {
      handle: 'psid',
      label: 'Messenger PSID',
      identifier: true,
      definition: 'string',
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
      label: 'Messenger',
      icon: 'MessageCircle',
      receive: 'receive_meta',
      send: 'send_messenger',
    },
  },
})
