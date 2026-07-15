import { defineNavigation } from 'skedyul'

export default defineNavigation({
  context: {
    agency: {
      model: 'agency',
      mode: 'first',
      filters: {
        status: { equals: 'ACTIVE' },
      },
    },
  },
  sidebar: {
    sections: [
      {
        items: [
          {
            label: 'Leads',
            href: '/leads',
            icon: 'Users',
            hidden: '{{ agency == blank }}',
          },
        ],
      },
    ],
  },
})
