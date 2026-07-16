/**
 * Navigation
 */

import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Account', href: '/account', icon: 'Settings' },
          { label: 'WhatsApp Numbers', href: '/whatsapp-numbers', icon: 'MessageSquare' },
          { label: 'Facebook Pages', href: '/facebook-pages', icon: 'MessageCircle' },
          { label: 'Instagram Accounts', href: '/instagram-accounts', icon: 'Instagram' },
        ],
      },
    ],
  },
})
