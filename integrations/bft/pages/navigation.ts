/**
 * Base Navigation Configuration
 *
 * Default navigation for all pages in the app.
 */

import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'General', href: '/settings', icon: 'Settings' },
          { label: 'Packages', href: '/packages', icon: 'Package' },
          { label: 'Classes', href: '/classes', icon: 'BookOpen' },
          { label: 'Prospects', href: '/prospects', icon: 'UserPlus' },
        ],
      },
    ],
  },
})
