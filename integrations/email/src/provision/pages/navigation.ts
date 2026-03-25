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
          { label: 'Email', href: '/email', icon: 'Mail' },
        ],
      },
    ],
  },
})
