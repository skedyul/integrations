import { setup } from 'skedyul'

export const CALENDAR_EVENTS_SETUP_STEP = 'setup_calendar_events'

/**
 * Whether the installation may sync calendars and emit calendar events.
 *
 * Connecting a Google account only completes `connect_google`. Until the user
 * finishes `setup_calendar_events` there is no CRM mapping to receive events,
 * so syncing would emit a flood of events with nowhere to land.
 */
export async function isCalendarSyncEnabled(): Promise<boolean> {
  const step = await setup.get(CALENDAR_EVENTS_SETUP_STEP)
  return step?.status === 'READY'
}
