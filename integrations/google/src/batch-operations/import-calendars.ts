import { defineBatchOperation, instance, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { emitGoogleEvent } from '../lib/emit-google-event'
import {
  toCalendarEntityPayload,
  upsertLinkedGoogleCalendars,
} from '../lib/seed-google-calendars'
import { listGoogleCalendars, type GoogleCalendarSummary } from '../services/calendar/client'
import type { GoogleCalendarRecord } from '../events/types'

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
    const existing = await instance.list('google_calendar', { limit: 250 })
    const incomingIds = new Set(calendars.map((calendar) => calendar.calendar_id))

    for (const raw of existing.data) {
      const record = raw as GoogleCalendarRecord
      if (!record.calendar_id || incomingIds.has(record.calendar_id)) {
        continue
      }
      await emitGoogleEvent(
        ctx.appInstallationId,
        'calendar.deleted',
        {
          calendar: {
            calendar_id: record.calendar_id,
            summary: record.summary || record.calendar_id,
            primary: Boolean(record.primary),
            timezone: null,
            description: null,
          },
          sync: { trigger: 'import' },
        },
        `import:deleted:${record.calendar_id}`,
        'import',
      )
    }

    await upsertLinkedGoogleCalendars({
      calendars,
      appInstallationId: ctx.appInstallationId,
      trigger: 'import',
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
