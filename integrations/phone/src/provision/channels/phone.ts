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
  ],

  capabilities: {
    messaging: {
      label: 'SMS',
      icon: 'MessageSquare',
      receive: 'receive_sms',
      send: 'send_sms',
      send_batch: {
        send: 'send_sms_batch',
        get_status: 'get_sms_bulk_status',
      },
    },
    voice: {
      label: 'Voice',
      icon: 'Phone',
      receive: 'receive_call',
      send: 'make_call',
    },
  },
})
