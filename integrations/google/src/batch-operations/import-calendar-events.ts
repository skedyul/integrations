import { defineBatchOperation, type BatchOperationContext } from 'skedyul'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { toCalendarEntityPayload } from '../lib/seed-google-calendars'
import {
  listGoogleCalendarEvents,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { buildCalendarPeopleCascadeItems } from '../lib/calendar-people'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import {
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
} from '../services/calendar/sync'
import type { GoogleCalendarRecord } from '../events/types'

interface ImportCalendarEventsState {
  calendars: GoogleCalendarRecord[]
  calendarIndex: number
  pageToken?: string
  nextSyncToken?: string | null
  calendarsEmitted?: boolean
  useSyncToken?: boolean
}

function toSummary(record: GoogleCalendarRecord): GoogleCalendarSummary {
  return {
    calendar_id: record.calendar_id,
    summary: record.summary || record.calendar_id,
    primary: Boolean(record.primary),
    access_role: null,
    time_zone: null,
    description: null,
    color: null,
  }
}

function readStringInput(
  input: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

async function resolveImportCalendars(
  input: Record<string, unknown> | undefined,
  env: GoogleInstallEnv,
): Promise<GoogleCalendarRecord[]> {
  const calendarId = readStringInput(input, 'calendar_id')
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

  iterate: async (ctx) => {
    const state = { ...(ctx.state as ImportCalendarEventsState | undefined) }
    if (!state.calendars) {
      throw new Error('Setup state missing - calendars not found')
    }

    const cascadeEntities = new Set(ctx.cascadeEntities ?? [])
    const itemsByEntity: Record<string, Record<string, unknown>[]> = {}

    if (!state.calendarsEmitted && cascadeEntities.has('calendar')) {
      itemsByEntity.calendar = state.calendars.map((record) => ({
        calendar: toCalendarEntityPayload(toSummary(record), record),
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
    const useSyncToken = state.useSyncToken !== false
    const syncToken = useSyncToken ? calendar.sync_token : undefined
    const timeMin = syncToken ? undefined : readStringInput(ctx.input, 'time_min')
    const timeMax = syncToken ? undefined : readStringInput(ctx.input, 'time_max')

    let page
    try {
      page = await listGoogleCalendarEvents(client, {
        calendarId: calendar.calendar_id,
        syncToken: syncToken || undefined,
        timeMin,
        timeMax,
        pageToken: state.pageToken,
        maxResults: ctx.limit > 0 ? ctx.limit : 100,
      })
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'SYNC_TOKEN_INVALID') {
        throw error
      }

      state.calendars[state.calendarIndex] = {
        ...calendar,
        sync_token: null,
      }
      page = await listGoogleCalendarEvents(client, {
        calendarId: calendar.calendar_id,
        timeMin: readStringInput(ctx.input, 'time_min'),
        timeMax: readStringInput(ctx.input, 'time_max'),
        pageToken: state.pageToken,
        maxResults: ctx.limit > 0 ? ctx.limit : 100,
      })
    }

    const eventItems: Record<string, unknown>[] = []
    const userItems: Record<string, unknown>[] = []
    const attendeeItems: Record<string, unknown>[] = []
    const seenUserEmails = new Set<string>()

    for (const googleEvent of page.events) {
      if (!googleEvent.id) {
        continue
      }
      const event = normalizeGoogleCalendarEvent(googleEvent)
      const people = buildCalendarPeopleCascadeItems({
        googleEventId: event.google_event_id,
        calendarId: calendar.calendar_id,
        event,
      })

      if (cascadeEntities.has('user')) {
        for (const item of people.users) {
          const email =
            item.user && typeof item.user === 'object' && 'email' in item.user
              ? String((item.user as { email?: unknown }).email ?? '')
              : ''
          if (!email || seenUserEmails.has(email)) {
            continue
          }
          seenUserEmails.add(email)
          userItems.push(item)
        }
      }

      if (cascadeEntities.has('calendar_event')) {
        eventItems.push({
          calendar_event: {
            ...event,
            calendar_id: calendar.calendar_id,
            ...(people.organizerMatch ? { organizer: people.organizerMatch } : {}),
          },
          calendar: { __crmMatch: calendar.calendar_id },
          ...(people.organizerMatch ? { organizer: people.organizerMatch } : {}),
        })
      }

      if (cascadeEntities.has('attendee')) {
        attendeeItems.push(...people.attendees)
      }
    }

    if (userItems.length > 0) {
      itemsByEntity.user = userItems
    }
    if (eventItems.length > 0) {
      itemsByEntity.calendar_event = eventItems
    }
    if (attendeeItems.length > 0) {
      itemsByEntity.attendee = attendeeItems
    }

    if (page.nextSyncToken) {
      state.nextSyncToken = page.nextSyncToken
    }

    if (page.nextPageToken) {
      state.pageToken = page.nextPageToken
    } else {
      const lastSyncedAt = new Date().toISOString()
      const nextSyncToken = state.nextSyncToken ?? calendar.sync_token ?? null
      state.calendars[state.calendarIndex] = {
        ...calendar,
        sync_token: nextSyncToken,
        last_synced_at: lastSyncedAt,
      }
      if (cascadeEntities.has('calendar')) {
        itemsByEntity.calendar = [
          ...(itemsByEntity.calendar ?? []),
          {
            calendar: toCalendarEntityPayload(toSummary(calendar), {
              ...calendar,
              sync_token: nextSyncToken,
              last_synced_at: lastSyncedAt,
            }),
          },
        ]
      }
      state.pageToken = undefined
      state.nextSyncToken = undefined
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
