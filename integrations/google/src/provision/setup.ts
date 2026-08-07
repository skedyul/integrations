import { defineSetupStep } from 'skedyul'

export const connectGoogleStep = defineSetupStep({
  handle: 'connect_google',
  label: 'Connect Google account',
  description: 'Authorize Google Calendar access for this installation.',
  kind: 'app',
  capabilities: ['google.connected'],
})

export const setupCalendarEventsStep = defineSetupStep({
  handle: 'setup_calendar_events',
  label: 'Set up calendar events',
  description:
    'Map Google Calendar events to your CRM and enable live sync from calendar changes.',
  kind: 'crm',
  requires: ['connect_google'],
  entities: ['calendar_event'],
  workflowHandles: ['sync-google-calendar-event-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.calendar_event', 'realtime.calendar_event'],
})

export default [connectGoogleStep, setupCalendarEventsStep]
