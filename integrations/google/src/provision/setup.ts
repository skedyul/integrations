import { defineSetupStep } from 'skedyul'

export const connectGoogleStep = defineSetupStep({
  handle: 'connect_google',
  label: 'Connect Google account',
  description:
    'Authorize Google Calendar access. Connect only stores tokens — it does not import history or start live sync.',
  kind: 'app',
  capabilities: ['google.connected'],
  actionTool: 'reconnect_google',
  actionLabel: 'Reconnect Google',
})

export const setupCalendarsStep = defineSetupStep({
  handle: 'setup_calendars',
  label: 'Set up calendars',
  description:
    'Map Google calendars to your CRM, then use Import on the Calendars hub for history. Live wiring is for later single calendar changes, not backfill.',
  kind: 'crm',
  requires: ['connect_google'],
  entities: ['calendar'],
  workflowHandles: ['sync-google-calendar-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.calendar', 'realtime.calendar'],
  href: '/calendars',
})

export const setupCalendarEventsStep = defineSetupStep({
  handle: 'setup_calendar_events',
  label: 'Set up calendar events',
  description:
    'Map Google Calendar events to your CRM, then use Import on the Events hub for history. Live event wiring is for later single changes, not pull sync.',
  kind: 'crm',
  requires: ['setup_calendars'],
  entities: ['calendar_event'],
  workflowHandles: [
    'sync-google-calendar-event-from-webhook',
    'push-calendar-event-rename-to-google',
  ],
  listenToCrm: true,
  capabilities: ['crm.calendar_event', 'realtime.calendar_event'],
  href: '/events',
})

export default [connectGoogleStep, setupCalendarsStep, setupCalendarEventsStep]
