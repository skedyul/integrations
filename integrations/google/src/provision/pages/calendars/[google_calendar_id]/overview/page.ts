import { definePage } from 'skedyul'

export default definePage({
  handle: 'calendar_overview',
  label: 'Overview',
  type: 'instance',
  path: '/calendars/[google_calendar_id]/overview',
  model: 'google_calendar',
  navigation: false,
  context: {
    google_calendar: {
      model: 'google_calendar',
      mode: 'route',
    },
  },
  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar Sync Settings',
        description: 'Review sync settings for this linked Google Calendar.',
      },
      form: {
        id: 'google-calendar-overview-form',
        fields: [
          {
            component: 'input',
            id: 'summary',
            row: 0,
            col: 0,
            label: 'Calendar Name',
            leftIcon: 'Calendar',
            value: '{{ google_calendar.summary }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'calendar_id',
            row: 1,
            col: 0,
            label: 'Calendar ID',
            leftIcon: 'Hash',
            value: '{{ google_calendar.calendar_id }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'sync_enabled',
            row: 2,
            col: 0,
            label: 'Sync Enabled',
            leftIcon: 'CalendarSync',
            value: '{{ google_calendar.sync_enabled }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'sync_direction',
            row: 3,
            col: 0,
            label: 'Sync Direction',
            leftIcon: 'ArrowLeftRight',
            value: '{{ google_calendar.sync_direction }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'last_synced_at',
            row: 4,
            col: 0,
            label: 'Last Synced At',
            leftIcon: 'Clock',
            value: '{{ google_calendar.last_synced_at }}',
            disabled: true,
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'summary', colSpan: 12 }] },
            { columns: [{ field: 'calendar_id', colSpan: 12 }] },
            { columns: [{ field: 'sync_enabled', colSpan: 6 }, { field: 'sync_direction', colSpan: 6 }] },
            { columns: [{ field: 'last_synced_at', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
