import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { toCalendarEntityPayload } from '../lib/seed-google-calendars'
import {
  filterSyncEnabledCalendars,
  recordFromGoogleSummary,
} from '../lib/calendar-record'
import {
  iterateCalendarEventImport,
  type ImportCalendarEventsState,
} from '../lib/calendar-event-import'
import { listGoogleCalendars, type GoogleCalendarSummary } from '../services/calendar/client'

interface ImportCalendarsState extends Partial<ImportCalendarEventsState> {
  listedCalendars: GoogleCalendarSummary[]
}

export default defineBatchOperation({
  handle: 'import_calendars',
  label: 'Import Calendars',
  description:
    'Import Google calendars and cascade events, people, and attendees when those CRM maps are configured.',
  entity: 'calendar',
  cascade: [
    { entity: 'calendar', order: 1, wave: 'page' },
    { entity: 'user', order: 2, wave: 'page' },
    { entity: 'calendar_event', order: 3, wave: 'page' },
    { entity: 'attendee', order: 4, wave: 'page' },
  ],
  maxConcurrent: 1,
  pageSize: 100,
  icon: 'calendar',

  setup: async (ctx: BatchOperationContext) => {
    const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
    const listedCalendars = await listGoogleCalendars(client)

    ctx.log.info(`Prepared ${listedCalendars.length} Google calendars for CRM import`)
    return {
      state: {
        listedCalendars,
        calendarsEmitted: false,
      } satisfies ImportCalendarsState,
    }
  },

  iterate: async (ctx) => {
    const state = { ...(ctx.state as ImportCalendarsState | undefined) }
    if (!state.listedCalendars) {
      throw new Error('Setup state missing - calendars not found')
    }

    if (!state.calendarsEmitted) {
      const items = state.listedCalendars.map((calendar) => ({
        calendar: toCalendarEntityPayload(calendar),
      }))
      const eventCalendars = filterSyncEnabledCalendars(
        state.listedCalendars.map((calendar) => recordFromGoogleSummary(calendar)),
      )
      ctx.log.info(
        `Emitted ${items.length} calendars; paging events for ${eventCalendars.length} sync-enabled`,
      )
      return {
        items,
        itemsByEntity: { calendar: items },
        pagination: { hasMore: eventCalendars.length > 0, page: ctx.page },
        state: {
          listedCalendars: state.listedCalendars,
          calendarsEmitted: true,
          calendars: eventCalendars,
          calendarIndex: 0,
          useSyncToken: false,
        } satisfies ImportCalendarsState,
      }
    }

    const result = await iterateCalendarEventImport({
      ...ctx,
      state: {
        calendars: state.calendars ?? [],
        calendarIndex: state.calendarIndex ?? 0,
        pageToken: state.pageToken,
        nextSyncToken: state.nextSyncToken,
        calendarsEmitted: true,
        useSyncToken: state.useSyncToken,
      } satisfies ImportCalendarEventsState,
    })

    return {
      ...result,
      state: {
        listedCalendars: state.listedCalendars,
        calendarsEmitted: true,
        ...(result.state ?? {}),
      } satisfies ImportCalendarsState,
    }
  },
})
