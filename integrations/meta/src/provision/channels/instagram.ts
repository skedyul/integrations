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
