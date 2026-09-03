import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import {
  iterateCalendarEventImport,
  readBatchStringInput,
  type ImportCalendarEventsState,
} from '../lib/calendar-event-import'
import {
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
} from '../services/calendar/sync'
import type { GoogleCalendarRecord } from '../events/types'

async function resolveImportCalendars(
  input: Record<string, unknown> | undefined,
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const calendarId = readBatchStringInput(input, 'calendar_id')
  if (!calendarId) {
    return loadLinkedGoogleCalendars(env)
  }

  const record = await loadGoogleCalendarRecord(calendarId, env)
  if (!record) {
    throw new Error(`Calendar ${calendarId} is not available on the connected Google account`)
  }
  return [record]
}

export default defineBatchOperation({
  handle: 'import_calendar_events',
  label: 'Import Calendar Events',
  description:
    'Import events from sync-enabled Google calendars and cascade the parent calendar when its CRM map is configured.',
  entity: 'calendar_event',
  cascade: [
    { entity: 'calendar', order: 1, wave: 'setup' },
    { entity: 'user', order: 2, wave: 'page' },
    { entity: 'calendar_event', order: 3, wave: 'page' },
    { entity: 'attendee', order: 4, wave: 'page' },
  ],
  maxConcurrent: 1,
  pageSize: 100,
  icon: 'calendar-days',

  setup: async (ctx: BatchOperationContext) => {
    const calendars = await resolveImportCalendars(ctx.input, ctx.env as GoogleInstallEnv)
    if (calendars.length === 0) {
      throw new Error(
        'No Google calendars found. Connect a Google account and import calendars first.',
      )
    }

    const useSyncToken = ctx.input?.use_sync_token !== false
    ctx.log.info(
      `Importing events from ${calendars.length} calendar(s) (useSyncToken=${useSyncToken})`,
    )
    return {
      state: {
        calendars,
        calendarIndex: 0,
        calendarsEmitted: false,
        useSyncToken,
      } satisfies ImportCalendarEventsState,
    }
  },

  iterate: iterateCalendarEventImport,
})
