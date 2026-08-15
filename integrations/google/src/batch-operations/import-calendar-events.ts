import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { toCalendarEntityPayload } from '../lib/seed-google-calendars'
import {
  listGoogleCalendarEvents,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadLinkedGoogleCalendars } from '../services/calendar/sync'
import type { GoogleCalendarRecord } from '../events/types'

interface ImportCalendarEventsState {
  calendars: Array<GoogleCalendarRecord & { time_zone?: string | null; description?: string | null }>
  calendarIndex: number
  pageToken?: string
  calendarsEmitted?: boolean
}

function toSummary(record: GoogleCalendarRecord): GoogleCalendarSummary {
  return {
    calendar_id: record.calendar_id,
    summary: record.summary || record.calendar_id,
    primary: Boolean(record.primary),
    access_role: null,
    time_zone: null,
    description: null,
  }
}

export default defineBatchOperation({
  handle: 'import_calendar_events',
  label: 'Import Calendar Events',
  description:
    'Import events from sync-enabled Google calendars and cascade the parent calendar when its CRM map is configured.',
  entity: 'calendar_event',
  cascade: [
    { entity: 'calendar', order: 1, wave: 'setup' },
    { entity: 'calendar_event', order: 2, wave: 'page' },
  ],
  maxConcurrent: 1,
  pageSize: 100,
  icon: 'calendar-days',

  setup: async (ctx: BatchOperationContext) => {
    const calendars = await loadLinkedGoogleCalendars()
    if (calendars.length === 0) {
      throw new Error(
        'No sync-enabled calendars found. Import calendars and enable sync first.',
      )
    }

    ctx.log.info(`Importing events from ${calendars.length} sync-enabled calendars`)
    return {
      state: {
        calendars,
        calendarIndex: 0,
        calendarsEmitted: false,
      } satisfies ImportCalendarEventsState,
    }
  },

  iterate: async (ctx) => {
    const state = { ...(ctx.state as ImportCalendarEventsState | undefined) }
    if (!state.calendars) {
      throw new Error('Setup state missing - calendars not found')
    }

    const cascadeEntities = new Set(ctx.cascadeEntities ?? [])
    const itemsByEntity: Record<string, Record<string, unknown>[]> = {}

    if (!state.calendarsEmitted && cascadeEntities.has('calendar')) {
      itemsByEntity.calendar = state.calendars.map((record) => ({
        calendar: toCalendarEntityPayload(toSummary(record)),
      }))
      state.calendarsEmitted = true
    } else if (!state.calendarsEmitted) {
      state.calendarsEmitted = true
    }

    if (state.calendarIndex >= state.calendars.length) {
      return {
        items: [],
        itemsByEntity,
        pagination: { hasMore: false, page: ctx.page },
        state,
      }
    }

    const calendar = state.calendars[state.calendarIndex]
    const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
    const page = await listGoogleCalendarEvents(client, {
      calendarId: calendar.calendar_id,
      pageToken: state.pageToken,
      maxResults: ctx.limit > 0 ? ctx.limit : 100,
    })

    const eventItems: Record<string, unknown>[] = []
    if (cascadeEntities.has('calendar_event')) {
      for (const googleEvent of page.events) {
        if (!googleEvent.id) {
          continue
        }
        const event = normalizeGoogleCalendarEvent(googleEvent)
        eventItems.push({
          calendar_event: {
            ...event,
            calendar_id: calendar.calendar_id,
          },
          calendar: { __crmMatch: calendar.calendar_id },
        })
      }
    }

    if (eventItems.length > 0) {
      itemsByEntity.calendar_event = eventItems
    }

    if (page.nextPageToken) {
      state.pageToken = page.nextPageToken
    } else {
      state.pageToken = undefined
      state.calendarIndex += 1
    }

    const hasMore = state.calendarIndex < state.calendars.length
    ctx.log.info(
      `Imported ${eventItems.length} events from ${calendar.calendar_id} (hasMore=${hasMore})`,
    )

    return {
      items: eventItems,
      itemsByEntity,
      pagination: {
        hasMore,
        page: ctx.page,
        nextCursor: state.pageToken,
      },
      state,
    }
  },
})
