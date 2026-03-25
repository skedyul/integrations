/**
 * Navigation
 *
 * Base navigation configuration for all pages.
 */

import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Account', href: '/account', icon: 'Settings' },
          { label: 'WhatsApp Numbers', href: '/whatsapp-numbers', icon: 'MessageSquare' },
        ],
      },
    ],
  },
})
