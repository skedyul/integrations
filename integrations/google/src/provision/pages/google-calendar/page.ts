/**
 * Google Calendar (Consolidated)
 *
 * Single page combining Calendar and Calendar Event entities.
 * Import, CRM mapping, and live event wiring for both.
 * Path: /google-calendar
 */

import { definePage } from 'skedyul'
import {
  calendarTypes,
  calendarWorkflowHandle,
  calendarEventTypes,
  calendarEventWorkflowHandle,
} from '../../events/google-events'

export default definePage({
  handle: 'google-calendar',
  label: 'Google Calendar',
  type: 'instance',
  path: '/google-calendar',
  navigation: true,

  blocks: [
    // ─────────────────────────────────────────────────────────────────────────
    // CALENDARS SECTION
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendars',
        description:
          'Import and sync Google calendars. Configure the calendar CRM map first.',
      },
      form: {
        id: 'calendar-section-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'calendar-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar',
              title: 'Calendar field mapping',
              description:
                'Map Google calendar fields to your workplace calendar model. Use google_calendar_id as the match key.',
            },
          },
          {
            component: 'BatchOperationPanel',
            id: 'calendar-import-panel',
            row: 1,
            col: 0,
            props: {
              entity: 'calendar',
              operationHandle: 'import_calendars',
              title: 'Import calendars',
              description:
                'List Google calendars and upsert to your CRM calendar model',
              buttonLabel: 'Start Import',
              icon: 'Calendar',
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
              title: 'Calendar live sync',
              description:
                'Wire calendar created/updated/deleted webhooks. Use Import above for initial backfill.',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'calendar-crm-map-status', colSpan: 12 }] },
            { columns: [{ field: 'calendar-import-panel', colSpan: 12 }] },
            { columns: [{ field: 'calendar-event-wiring', colSpan: 12 }] },
          ],
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CALENDAR EVENTS SECTION
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Calendar Events',
        description:
          'Import and sync calendar events. Configure calendars above first, then the event CRM map.',
      },
      form: {
        id: 'calendar-event-section-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'calendar-event-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'calendar_event',
              title: 'Event field mapping',
              description:
                'Map Google event fields to your workplace event model. Use google_event_id + calendar_id as composite match keys.',
            },
          },
          {
            component: 'BatchOperationPanel',
            id: 'calendar-event-import-panel',
            row: 1,
            col: 0,
            props: {
              entity: 'calendar_event',
              operationHandle: 'import_calendar_events',
              title: 'Import events',
              description:
                'Page events from linked calendars and upsert to your CRM event model',
              buttonLabel: 'Start Import',
              icon: 'CalendarDays',
            },
          },
          {
            component: 'EventWiringPanel',
            id: 'calendar-event-event-wiring',
            row: 2,
            col: 0,
            props: {
              eventTypes: calendarEventTypes,
              recommendedWorkflowHandle: calendarEventWorkflowHandle,
              title: 'Event live sync',
              description:
                'Wire event webhooks for real-time sync. Includes inbound (from Google) and outbound (to Google) events.',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'calendar-event-crm-map-status', colSpan: 12 }] },
            { columns: [{ field: 'calendar-event-import-panel', colSpan: 12 }] },
            { columns: [{ field: 'calendar-event-event-wiring', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
