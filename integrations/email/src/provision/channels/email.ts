/**
 * Email Channel
 *
 * Email messaging via Mailgun.
 */

import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'email',
  label: 'Email',
  icon: 'Mail',

  fields: [
    {
      handle: 'email',
      label: 'Email',
      identifier: true,
      definition: 'email',
      visibility: {
        data: true,
        list: true,
        filters: true,
      },
    },
  ],

  capabilities: {
    messaging: {
      label: 'Email',
      icon: 'Mail',
      receive: 'receive_email',
      send: 'send_email',
    },
  },
})
