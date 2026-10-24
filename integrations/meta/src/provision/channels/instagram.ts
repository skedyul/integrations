/**
 * Instagram Channel
 *
 * Instagram Direct messaging via Meta Graph API.
 */

import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'instagram',
  label: 'Instagram',
  icon: 'Instagram',

  fields: [
    {
      handle: 'igsid',
      label: 'Instagram Scoped ID',
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
      label: 'Instagram',
      icon: 'Instagram',
      receive: 'receive_meta',
      send: 'send_instagram',
    },
  },
})
