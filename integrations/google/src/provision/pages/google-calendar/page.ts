/**
 * Google Calendar (Consolidated)
 *
 * Single page with EntitySyncGroup combining Calendar and Calendar Event entities.
 * Path: /google-calendar
 */

import { definePage } from 'skedyul'
import {
  calendarTypes,
  calendarEventTypes,
} from '../../events/google-events'

export default definePage({
  handle: 'google-calendar',
  label: 'Google Calendar',
  type: 'instance',
  path: '/google-calendar',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'google-calendar-sync-group',
        fields: [
          {
            component: 'EntitySyncGroup',
            id: 'google-calendar-entity-sync',
            row: 0,
            col: 0,
            props: {
              label: 'Google Calendar',
              description: 'Sync calendars and events with Skedyul',
              entities: [
                {
                  handle: 'calendar',
                  label: 'Calendars',
                  importOperationHandle: 'import_calendars',
                  importIcon: 'Calendar',
                  importLabel: 'Import calendars',
                },
                {
                  handle: 'calendar_event',
                  label: 'Events',
                  importOperationHandle: 'import_calendar_events',
                  importIcon: 'CalendarDays',
                  importLabel: 'Import events',
                },
                {
                  handle: 'user',
                  label: 'Users',
                  importOperationHandle: 'import_calendar_events',
                  importIcon: 'Users',
                  importLabel: 'Import people',
                },
                {
                  handle: 'attendee',
                  label: 'Attendees',
                  importOperationHandle: 'import_calendar_events',
                  importIcon: 'UserCheck',
                  importLabel: 'Import attendees',
                },
              ],
              eventTypes: [...calendarTypes, ...calendarEventTypes],
              inboundLabel: 'FROM GOOGLE',
              outboundLabel: 'TO GOOGLE',
              inboundDescription: 'When Google Calendar changes, update Skedyul',
              outboundDescription: 'When Skedyul changes, update Google Calendar',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'google-calendar-entity-sync', colSpan: 12 }] }],
        },
      },
    },
  ],
})
