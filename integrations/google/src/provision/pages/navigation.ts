import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Setup', href: '/setup', icon: 'ListChecks' },
          { label: 'Account', href: '/account', icon: 'Settings' },
          { label: 'Calendars', href: '/calendars', icon: 'Calendar' },
          { label: 'Events', href: '/events', icon: 'CalendarDays' },
        ],
      },
    ],
  },
})
