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
  navigation: false, // Hidden: use consolidated /google-calendar page

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Import Calendar Events',
        description:
          'History lives here. Connect and live event wiring do not backfill. Start one event import batch after the calendar and event CRM maps are ready.',
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
        title: 'Live event wiring',
        description:
          'Optional wiring for a later single calendar.event change. Pull sync, Import, and Google push start one batch job — they do not emit one webhook per event.',
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
              title: 'How calendar event history works',
              description:
                'Import Calendar Events (or calendar_sync / a live Google push ping) starts one import_calendar_events batch. That job pages Google and upserts CRM rows. Do not wire live events to backfill history. Changing a mapped event in CRM runs push-calendar-event-update-to-google, which patches Google. On a workplace Event list, set Calendar view section to the calendar relationship so events from every synced calendar appear together.',
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
          'Map Google Calendar events to a workplace CRM model. Use google_event_id + calendar_id as composite match keys (not required on Skedyul create), and map the calendar relationship so Calendar LIST view can group events by calendar.',
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
