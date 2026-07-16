import { defineNavigation } from 'skedyul'

export default defineNavigation({
  sidebar: {
    parent: '/facebook-pages',
    items: [{ label: 'Overview', href: '/overview', icon: 'LayoutDashboard' }],
  },
})
