/**
 * Google Calendar app event catalog for install pages (EventWiringPanel).
 */

export type GoogleAppEventDefinition = {
  type: string
  label: string
  description: string
  icon: string
}

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

/** Bundled sync workflow handle (created on Google app install). */
export const calendarEventWorkflowHandle = 'sync-google-calendar-event-from-webhook'
