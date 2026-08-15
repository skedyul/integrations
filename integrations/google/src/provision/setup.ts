import { defineSetupStep } from 'skedyul'

export const connectGoogleStep = defineSetupStep({
  handle: 'connect_google',
  label: 'Connect Google account',
  description: 'Authorize Google Calendar access for this installation.',
  kind: 'app',
  capabilities: ['google.connected'],
  actionTool: 'reconnect_google',
  actionLabel: 'Reconnect Google',
})

export const setupCalendarsStep = defineSetupStep({
  handle: 'setup_calendars',
  label: 'Set up calendars',
  description:
    'Map Google calendars to your CRM and enable live sync when new calendars appear.',
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
    'Map Google Calendar events to your CRM, link them to calendars, and enable live sync from calendar changes.',
  kind: 'crm',
  requires: ['setup_calendars'],
  entities: ['calendar_event'],
  workflowHandles: ['sync-google-calendar-event-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.calendar_event', 'realtime.calendar_event'],
  href: '/events',
})

export default [connectGoogleStep, setupCalendarsStep, setupCalendarEventsStep]
