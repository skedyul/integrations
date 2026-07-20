import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Account', href: '/account', icon: 'Settings' },
          { label: 'Calendars', href: '/calendars', icon: 'Calendar' },
        ],
      },
    ],
  },
})
