import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { toCalendarImportPayload } from '../lib/seed-google-calendars'
import {
  filterSyncEnabledCalendars,
  overlayCrmCalendarState,
  recordFromGoogleSummary,
} from '../lib/calendar-record'
import { listCrmCalendarRecords } from '../lib/crm-calendars'
import {
  iterateCalendarEventImport,
  type ImportCalendarEventsState,
} from '../lib/calendar-event-import'
import { listGoogleCalendars, type GoogleCalendarSummary } from '../services/calendar/client'
import type { GoogleCalendarRecord } from '../events/types'

interface ImportCalendarsState extends Partial<ImportCalendarEventsState> {
  listedCalendars: GoogleCalendarSummary[]
  /** CRM calendar rows that existed before this import (keep their sync flags). */
  crmCalendars?: GoogleCalendarRecord[]
}

async function safeCrmCalendars(ctx: BatchOperationContext): Promise<GoogleCalendarRecord[]> {
  try {
    return await listCrmCalendarRecords()
  } catch (error) {
    ctx.log.warn('Could not read CRM calendar rows; treating every calendar as new', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
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
    const crmCalendars = await safeCrmCalendars(ctx)

    ctx.log.info(`Prepared ${listedCalendars.length} Google calendars for CRM import`)
    return {
      state: {
        listedCalendars,
        crmCalendars,
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
      const crmCalendars = state.crmCalendars ?? []
      const existingIds = new Set(crmCalendars.map((record) => record.calendar_id))
      // Sync flags only on first create: re-importing must not reset the
      // workplace's sync_enabled / sync_direction choices.
      const items = state.listedCalendars.map((calendar) => ({
        calendar: toCalendarImportPayload(calendar, {
          exists: existingIds.has(calendar.calendar_id),
        }),
      }))
      const eventCalendars = filterSyncEnabledCalendars(
        overlayCrmCalendarState(
          state.listedCalendars.map((calendar) => recordFromGoogleSummary(calendar)),
          crmCalendars,
        ),
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
        pendingSyncState: state.pendingSyncState,
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
