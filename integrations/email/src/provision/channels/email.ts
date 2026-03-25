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
      label: 'Email',
      icon: 'Mail',
      receive: 'receive_email',
      send: 'send_email',
    },
  },
})
