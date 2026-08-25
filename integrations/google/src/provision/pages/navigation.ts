import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          { label: 'Setup', href: '/setup', icon: 'ListChecks' },
          { label: 'Account', href: '/account', icon: 'Settings' },
          { label: 'Google Calendar', href: '/google-calendar', icon: 'Calendar' },
        ],
      },
    ],
  },
})
