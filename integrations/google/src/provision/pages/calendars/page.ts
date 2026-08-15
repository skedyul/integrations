/**
 * Calendars hub
 *
 * Import Google calendars, wire live calendar events, and configure the CRM map.
 * Path: /calendars
 */

import { definePage } from 'skedyul'
import { calendarTypes, calendarWorkflowHandle } from '../../events/google-events'

export default definePage({
  handle: 'calendars',
  label: 'Calendars',
  type: 'instance',
  path: '/calendars',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Import Calendars',
        description:
          'Import calendars from the connected Google account into your CRM. Linked sync-state records stay on the Linked calendars page.',
      },
      form: {
        id: 'calendar-import-form',
        fields: [
          {
            component: 'BatchOperationPanel',
            id: 'calendar-import-panel',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar',
              operationHandle: 'import_calendars',
              title: 'Calendar Import',
              description:
                'List Google calendars, link them for sync, and upsert CRM calendar records when the map is ready',
              buttonLabel: 'Start Import',
              icon: 'Calendar',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'calendar-import-panel', colSpan: 12 }] }],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar events',
        description:
          'When Google calendars are discovered or change, the Google app emits app.google.calendar.* events. Connect these to the bundled calendar sync workflow.',
      },
      form: {
        id: 'calendar-events-form',
        fields: [
          {
            component: 'CrmSetupStatusBanner',
            id: 'crm-setup-banner',
            row: 0,
            col: 0,
          },
          {
            component: 'Alert',
            id: 'calendar-events-info',
            row: 1,
            col: 0,
            props: {
              title: 'How calendar sync works',
              description:
                'OAuth, import, and calendar list refresh emit calendar.created/updated/deleted. Wire those events to sync-google-calendar-from-webhook. Review linked watch/sync state at /calendars/linked.',
              icon: 'Info',
            },
          },
          {
            component: 'EventWiringPanel',
            id: 'calendar-event-wiring',
            row: 2,
            col: 0,
            props: {
              eventTypes: calendarTypes,
              recommendedWorkflowHandle: calendarWorkflowHandle,
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'crm-setup-banner', colSpan: 12 }] },
            { columns: [{ field: 'calendar-events-info', colSpan: 12 }] },
            { columns: [{ field: 'calendar-event-wiring', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar CRM map',
        description:
          'Map Google calendars to a workplace CRM model. Use google_calendar_id as the match key so events can relate to the calendar in Calendar LIST view.',
      },
      form: {
        id: 'calendar-crm-map-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'calendar-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar',
              title: 'Calendars',
              description: 'Map calendar fields to your CRM calendar model',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'calendar-crm-map-status', colSpan: 12 }] }],
        },
      },
    },
  ],
})
