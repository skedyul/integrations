import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          {
            label: 'Leads',
            href: '/leads',
            icon: 'Users',
          },
        ],
      },
    ],
  },
})
