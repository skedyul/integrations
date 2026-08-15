import importCalendars from './import-calendars'
import importCalendarEvents from './import-calendar-events'

export const batchOperationRegistry = {
  import_calendars: importCalendars,
  import_calendar_events: importCalendarEvents,
}
