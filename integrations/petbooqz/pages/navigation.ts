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
          { label: 'Clients', href: '/clients', icon: 'Users' },
          { label: 'Patients', href: '/patients', icon: 'PawPrint' },
          { label: 'Appointments', href: '/appointments', icon: 'Calendar' },
        ],
      },
    ],
  },
})
