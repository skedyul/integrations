import type { BatchOperationContext, BatchOperationIterateResult } from 'skedyul'
import { getAuthenticatedOAuthClient } from './google_client'
import type { GoogleInstallEnv } from './google_install_env'
import { toCalendarEntityPayload } from './seed-google-calendars'
import { buildCalendarPeopleCascadeItems } from './calendar-people'
import {
  listGoogleCalendarEvents,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import type { GoogleCalendarRecord } from '../events/types'

export interface ImportCalendarEventsState {
  calendars: GoogleCalendarRecord[]
  calendarIndex: number
  pageToken?: string
  nextSyncToken?: string | null
  calendarsEmitted?: boolean
  useSyncToken?: boolean
}

export function toCalendarSummary(record: GoogleCalendarRecord): GoogleCalendarSummary {
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

export function readBatchStringInput(
  input: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asImportState(
  state: Record<string, unknown> | undefined,
): ImportCalendarEventsState | undefined {
  if (!state || !Array.isArray(state.calendars)) {
    return undefined
  }
  return state as unknown as ImportCalendarEventsState
}

type IterateContext = BatchOperationContext & {
  page?: number
  cursor?: string | number
  limit: number
}

/** Page events (and people/attendees) for calendars already on `state`. */
export async function iterateCalendarEventImport(
  ctx: IterateContext,
): Promise<BatchOperationIterateResult> {
  const incoming = asImportState(ctx.state)
  if (!incoming?.calendars) {
    throw new Error('Setup state missing - calendars not found')
  }
  const state: ImportCalendarEventsState = {
    ...incoming,
    calendarIndex: incoming.calendarIndex ?? 0,
  }

  const cascadeEntities = new Set(ctx.cascadeEntities ?? [])
  const itemsByEntity: Record<string, Record<string, unknown>[]> = {}

  if (!state.calendarsEmitted && cascadeEntities.has('calendar')) {
    itemsByEntity.calendar = state.calendars.map((record) => ({
      calendar: toCalendarEntityPayload(toCalendarSummary(record), record),
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
      state: { ...state } as Record<string, unknown>,
    }
  }

  const calendar = state.calendars[state.calendarIndex]
  const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
  const useSyncToken = state.useSyncToken !== false
  const syncToken = useSyncToken ? calendar.sync_token : undefined
  const timeMin = syncToken ? undefined : readBatchStringInput(ctx.input, 'time_min')
  const timeMax = syncToken ? undefined : readBatchStringInput(ctx.input, 'time_max')

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
      timeMin: readBatchStringInput(ctx.input, 'time_min'),
      timeMax: readBatchStringInput(ctx.input, 'time_max'),
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
          calendar: toCalendarEntityPayload(toCalendarSummary(calendar), {
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
    state: { ...state } as Record<string, unknown>,
  }
}
