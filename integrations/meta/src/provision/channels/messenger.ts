/**
 * Messenger Channel
 *
 * Facebook Messenger messaging via Meta Graph API.
 */

import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'messenger',
  label: 'Messenger',
  icon: 'MessageCircle',

  fields: [
    {
      handle: 'page_id',
      label: 'Page ID',
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
