/**
 * Google Calendar app event catalog for install pages (EventWiringPanel).
 */

export type GoogleAppEventDefinition = {
  type: string
  label: string
  description: string
  icon: string
}

export const calendarTypes: GoogleAppEventDefinition[] = [
  {
    type: 'app.google.calendar.created',
    label: 'Calendar created',
    description: 'A Google Calendar was discovered or linked for this installation',
    icon: 'CalendarPlus',
  },
  {
    type: 'app.google.calendar.updated',
    label: 'Calendar updated',
    description: 'A linked Google Calendar\'s metadata changed',
    icon: 'Calendar',
  },
  {
    type: 'app.google.calendar.deleted',
    label: 'Calendar deleted',
    description: 'A Google Calendar was removed from the connected account',
    icon: 'CalendarX',
  },
]

export const calendarEventTypes: GoogleAppEventDefinition[] = [
  {
    type: 'app.google.calendar.event.created',
    label: 'Calendar event created',
    description: 'A new Google Calendar event was detected or created',
    icon: 'CalendarPlus',
  },
  {
    type: 'app.google.calendar.event.updated',
    label: 'Calendar event updated',
    description: 'A Google Calendar event was changed',
    icon: 'CalendarClock',
  },
  {
    type: 'app.google.calendar.event.deleted',
    label: 'Calendar event deleted',
    description: 'A Google Calendar event was deleted or cancelled',
    icon: 'CalendarX',
  },
]

/** Bundled sync workflow handles (created on Google app install). */
export const calendarWorkflowHandle = 'sync-google-calendar-from-webhook'
export const calendarEventWorkflowHandle = 'sync-google-calendar-event-from-webhook'
export const calendarEventRenameWorkflowHandle =
  'push-calendar-event-rename-to-google'
