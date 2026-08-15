import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import {
  toCalendarEntityPayload,
  upsertLinkedGoogleCalendars,
} from '../lib/seed-google-calendars'
import { listGoogleCalendars, type GoogleCalendarSummary } from '../services/calendar/client'

interface ImportCalendarsState {
  calendars: GoogleCalendarSummary[]
  emitted?: boolean
}

export default defineBatchOperation({
  handle: 'import_calendars',
  label: 'Import Calendars',
  description:
    'Import Google calendars into linked sync records and upsert CRM calendar rows when the map is configured.',
  entity: 'calendar',
  cascade: [{ entity: 'calendar', order: 1, wave: 'page' }],
  maxConcurrent: 1,
  pageSize: 250,
  icon: 'calendar',

  setup: async (ctx: BatchOperationContext) => {
    const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
    const calendars = await listGoogleCalendars(client)
    await upsertLinkedGoogleCalendars({
      calendars,
      appInstallationId: ctx.appInstallationId,
      trigger: 'import',
      emitEvents: false,
    })

    ctx.log.info(`Prepared ${calendars.length} Google calendars for CRM import`)
    return {
      state: { calendars, emitted: false } satisfies ImportCalendarsState,
      total: calendars.length,
    }
  },

  iterate: async (ctx) => {
    const state = { ...(ctx.state as ImportCalendarsState | undefined) }
    if (!state.calendars) {
      throw new Error('Setup state missing - calendars not found')
    }

    if (state.emitted) {
      return {
        items: [],
        itemsByEntity: {},
        pagination: { hasMore: false, page: 1 },
        state,
      }
    }

    const items = state.calendars.map((calendar) => ({
      calendar: toCalendarEntityPayload(calendar),
    }))

    state.emitted = true
    return {
      items,
      itemsByEntity: { calendar: items },
      pagination: { hasMore: false, page: 1 },
      state,
    }
  },
})
