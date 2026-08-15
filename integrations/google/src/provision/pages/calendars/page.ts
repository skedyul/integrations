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
          'History lives here. Connect does not import. Start one calendar import batch after the CRM map is ready. Linked sync-state records stay on the Linked calendars page.',
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
        title: 'Live calendar wiring',
        description:
          'Optional wiring for later single calendar created/updated/deleted changes. Do not use this for history — Import above is the backfill path.',
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
              title: 'How calendar history works',
              description:
                'Connect only authorizes Google. Import Calendars starts one batch job that upserts CRM rows. Live wiring is for later single changes, not backfill. Review linked watch/sync state at /calendars/linked.',
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
