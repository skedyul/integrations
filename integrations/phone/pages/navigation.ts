/**
 * Base Navigation Configuration
 *
 * Default navigation for all pages in the app.
 * Individual pages can override this with their own navigation object.
 */

import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Compliance', href: '/compliance', icon: 'Shield' },
          { label: 'Phone Numbers', href: '/phone-numbers', icon: 'Phone' },
        ],
      },
    ],
  },
})
