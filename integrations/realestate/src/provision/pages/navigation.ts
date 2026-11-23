import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    sections: [
      {
        items: [
          {
            label: 'Setup',
            href: '/setup',
            icon: 'ListChecks',
          },
          {
            label: 'Agencies',
            href: '/agencies',
            icon: 'Building2',
            hidden: "{{ capabilities['agency.connected'] != true }}",
          },
        ],
      },
    ],
  },
})
