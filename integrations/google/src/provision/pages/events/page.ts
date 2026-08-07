/**
 * Calendar Events Page
 *
 * CRM map status and live event wiring for calendar_event entity.
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
                'When Google Calendar events change (via push sync or manual sync), the Google app emits app.google.calendar.event.* events. Connect these to the bundled sync workflow. CRM field mapping is configured below.',
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
          'Map Google Calendar events to a workplace CRM model. Use google_event_id + calendar_id as composite match keys.',
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
                'Map calendar event fields to your CRM event or appointment model',
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
