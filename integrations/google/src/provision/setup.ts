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
    'Map Google calendars to your CRM in Settings → CRM → Sources, then use Import on the Google Calendar page for history. Live updates (turned on in CRM Sources) cover later single calendar changes, not backfill.',
  kind: 'crm',
  requires: ['connect_google'],
  entities: ['calendar'],
  workflowHandles: ['sync-google-calendar-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.calendar', 'realtime.calendar'],
})

export const setupCalendarEventsStep = defineSetupStep({
  handle: 'setup_calendar_events',
  label: 'Set up calendar events',
  description:
    'Map Google Calendar events and people (users, attendees) to your CRM in Settings → CRM → Sources, then use Import on the Google Calendar page for history. Live updates (turned on in CRM Sources) cover later single changes, not pull sync.',
  kind: 'crm',
  requires: ['setup_calendars'],
  entities: ['calendar_event', 'user', 'attendee'],
  workflowHandles: [
    'sync-google-calendar-event-from-webhook',
    'push-calendar-event-create-to-google',
    'push-calendar-event-update-to-google',
  ],
  listenToCrm: true,
  capabilities: ['crm.calendar_event', 'realtime.calendar_event'],
})

export const setupCalendarPeopleStep = defineSetupStep({
  handle: 'setup_calendar_people',
  label: 'Set up calendar people',
  description:
    'Map Google Calendar users (email identity) and attendees (event RSVP) onto workplace people models such as customer or client.',
  kind: 'crm',
  requires: ['setup_calendar_events'],
  entities: ['user', 'attendee'],
  capabilities: ['crm.user', 'crm.attendee'],
})

export default [
  connectGoogleStep,
  setupCalendarsStep,
  setupCalendarEventsStep,
  setupCalendarPeopleStep,
]
