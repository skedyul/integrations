/**
 * Phone Channel
 *
 * SMS and voice communication via Twilio.
 */

import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'phone',
  label: 'Phone',
  icon: 'Phone',

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
      label: 'SMS',
      icon: 'MessageSquare',
      receive: 'receive_sms',
      send: 'send_sms',
    },
    voice: {
      label: 'Voice',
      icon: 'Phone',
      receive: 'receive_call',
      send: 'make_call',
    },
  },
})
