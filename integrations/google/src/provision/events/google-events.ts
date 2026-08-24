/**
 * Google Calendar app event catalog for install pages (EventWiringPanel).
 */

export type EventDirection = 'inbound' | 'outbound'

export type GoogleAppEventDefinition = {
  type: string
  label: string
  description: string
  icon: string
  sourceType?: string
  /** Sync direction: 'inbound' (Google → CRM) or 'outbound' (CRM → Google) */
  direction?: EventDirection
  recommendedWorkflowHandle?: string
}

export const calendarTypes: GoogleAppEventDefinition[] = [
  {
    type: 'app.google.calendar.created',
    label: 'Calendar created',
    description: 'A Google Calendar was discovered or linked for this installation',
    icon: 'CalendarPlus',
    direction: 'inbound',
  },
  {
    type: 'app.google.calendar.updated',
    label: 'Calendar updated',
    description: 'A linked Google Calendar\'s metadata changed',
    icon: 'Calendar',
    direction: 'inbound',
  },
  {
    type: 'app.google.calendar.deleted',
    label: 'Calendar deleted',
    description: 'A Google Calendar was removed from the connected account',
    icon: 'CalendarX',
    direction: 'inbound',
  },
]

export const calendarEventTypes: GoogleAppEventDefinition[] = [
  {
    type: 'app.google.calendar.event.created',
    label: 'Calendar event created',
    description: 'A new Google Calendar event was detected or created',
    icon: 'CalendarPlus',
    direction: 'inbound',
  },
  {
    type: 'app.google.calendar.event.updated',
    label: 'Calendar event updated',
    description: 'A Google Calendar event was changed',
    icon: 'CalendarClock',
    direction: 'inbound',
  },
  {
    type: 'app.google.calendar.event.deleted',
    label: 'Calendar event deleted',
    description: 'A Google Calendar event was deleted or cancelled',
    icon: 'CalendarX',
    direction: 'inbound',
  },
  {
    type: 'instance.created',
    label: 'CRM event created',
    description:
      'A new mapped workplace event was created. Unformat through the install map and create in Google.',
    icon: 'Plus',
    sourceType: 'CRM',
    direction: 'outbound',
    recommendedWorkflowHandle: 'push-calendar-event-create-to-google',
  },
  {
    type: 'instance.updated',
    label: 'CRM event updated',
    description:
      'A mapped workplace event changed. Unformat through the install map and patch Google.',
    icon: 'Pencil',
    sourceType: 'CRM',
    direction: 'outbound',
    recommendedWorkflowHandle: 'push-calendar-event-update-to-google',
  },
  {
    type: 'instance.deleted',
    label: 'CRM event deleted',
    description:
      'A mapped workplace event was deleted. Delete the corresponding Google Calendar event.',
    icon: 'Trash',
    sourceType: 'CRM',
    direction: 'outbound',
    recommendedWorkflowHandle: 'push-calendar-event-delete-to-google',
  },
]

/** Bundled sync workflow handles (created on Google app install). */
export const calendarWorkflowHandle = 'sync-google-calendar-from-webhook'
export const calendarEventWorkflowHandle = 'sync-google-calendar-event-from-webhook'
export const calendarEventCreateWorkflowHandle =
  'push-calendar-event-create-to-google'
export const calendarEventUpdateWorkflowHandle =
  'push-calendar-event-update-to-google'
export const calendarEventDeleteWorkflowHandle =
  'push-calendar-event-delete-to-google'
