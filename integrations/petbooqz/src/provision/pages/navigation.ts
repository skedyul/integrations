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
          { label: 'Overview', href: '/overview', icon: 'LayoutDashboard' },
        ],
      },
    ],
  },
})
