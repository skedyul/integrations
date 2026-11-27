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
  ],

  capabilities: {
    messaging: {
      label: 'Messenger',
      icon: 'MessageCircle',
      receive: 'receive_meta',
      send: 'send_messenger',
      // The person must message the Page first; replies only within 24h.
      initiation: 'contact',
      window: { hours: 24 },
    },
  },
})
