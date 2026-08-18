import { definePage } from 'skedyul'

export default definePage({
  handle: 'calendar_overview',
  label: 'Overview',
  type: 'instance',
  path: '/calendars/linked/[google_calendar_id]/overview',
  navigation: false,
  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar sync settings',
        description:
          'Sync and watch fields live on the mapped workplace calendar after Import. Open that CRM record to review them.',
      },
      form: {
        id: 'google-calendar-overview-form',
        fields: [
          {
            component: 'Alert',
            id: 'calendar-overview-info',
            row: 0,
            col: 0,
            props: {
              title: 'Settings are on the workplace calendar',
              description:
                'This page does not read an internal Google calendar model. After Import, summary, sync_enabled, and last_synced_at are on the mapped CRM calendar.',
              icon: 'Info',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'calendar-overview-info', colSpan: 12 }] }],
        },
      },
    },
  ],
})
