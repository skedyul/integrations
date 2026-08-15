/**
 * Calendar Events Page
 *
 * Import, CRM map status, and live event wiring for calendar_event entity.
 * Path: /events
 */

import { definePage } from 'skedyul'
import {
  calendarEventTypes,
  calendarEventWorkflowHandle,
} from '../../events/google-events'

export default definePage({
  handle: 'events',
  label: 'Events',
  type: 'instance',
  path: '/events',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Import Calendar Events',
        description:
          'Bulk import events from sync-enabled Google calendars into your CRM. Configure the calendar map first so each event can link to its calendar.',
      },
      form: {
        id: 'calendar-event-import-form',
        fields: [
          {
            component: 'BatchOperationPanel',
            id: 'calendar-event-import-panel',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar_event',
              operationHandle: 'import_calendar_events',
              title: 'Event Import',
              description:
                'Page events from linked calendars and upsert them when the calendar and event CRM maps are ready',
              buttonLabel: 'Start Import',
              icon: 'CalendarDays',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'calendar-event-import-panel', colSpan: 12 }] }],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar Events',
        description:
          'Google Calendar changes sync to your CRM via workflow triggers. Configure the CRM map and event wiring below.',
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
              title: 'How calendar event sync works',
              description:
                'When Google Calendar events change (via push sync, import, or manual sync), the Google app emits app.google.calendar.event.* events. The bundled workflow upserts the parent calendar first, then the event with a calendar relationship. On a workplace Event list, set Calendar view section to that relationship so events from every synced calendar appear together.',
              icon: 'Info',
            },
          },
          {
            component: 'EventWiringPanel',
            id: 'calendar-event-wiring',
            row: 2,
            col: 0,
            props: {
              eventTypes: calendarEventTypes,
              recommendedWorkflowHandle: calendarEventWorkflowHandle,
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
        title: 'Calendar event CRM map',
        description:
          'Map Google Calendar events to a workplace CRM model. Use google_event_id + calendar_id as composite match keys, and map the calendar relationship so Calendar LIST view can group events by calendar.',
      },
      form: {
        id: 'calendar-event-crm-map-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'calendar-event-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar_event',
              title: 'Calendar events',
              description:
                'Map calendar event fields and the calendar relationship to your CRM event or appointment model',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'calendar-event-crm-map-status', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
