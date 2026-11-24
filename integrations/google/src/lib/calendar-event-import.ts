import type { BatchOperationContext, BatchOperationIterateResult } from 'skedyul'
import { getAuthenticatedOAuthClient } from './google_client'
import type { GoogleInstallEnv } from './google_install_env'
import { toCalendarEntityPayload } from './seed-google-calendars'
import { buildCalendarPeopleCascadeItems } from './calendar-people'
import { updateCrmCalendarSyncState } from './crm-calendars'
import { findCrmEventsByGoogleIds, type ExistingEventRow } from './crm-events'
import { decideEventUpsert, eventLookupIds, type EventUpsertDecision } from './event-upsert-plan'
import { isGoogleNotFound } from './google-errors'
import {
  listGoogleCalendarEvents,
  type GoogleCalendarSummary,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import type { GoogleCalendarRecord, GoogleEventEntity } from '../events/types'

/** Sync state of a fully paged calendar, written on the following iterate. */
export interface PendingCalendarSyncState {
  calendar_id: string
  crm_instance_id: string | null
  sync_token: string | null
  last_synced_at: string
}

export interface ImportCalendarEventsState {
  calendars: GoogleCalendarRecord[]
  calendarIndex: number
  pageToken?: string
  nextSyncToken?: string | null
  calendarsEmitted?: boolean
  useSyncToken?: boolean
  /**
   * Tokens are saved one iterate later, after the platform has upserted the
   * calendar's last page, so a failed upsert cannot advance the token past
   * changes that never landed. When the last calendar finishes, the job
   * reports hasMore once more just to save its token.
   */
  pendingSyncState?: PendingCalendarSyncState[]
}

export function toCalendarSummary(record: GoogleCalendarRecord): GoogleCalendarSummary {
  return {
    calendar_id: record.calendar_id,
    summary: record.summary || record.calendar_id,
    primary: Boolean(record.primary),
    access_role: null,
    time_zone: record.timezone ?? null,
    description: record.description ?? null,
    color: record.color ?? null,
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

async function flushPendingSyncState(
  pending: PendingCalendarSyncState[] | undefined,
  ctx: IterateContext,
): Promise<void> {
  for (const entry of pending ?? []) {
    const saved = await updateCrmCalendarSyncState(
      { calendar_id: entry.calendar_id, crm_instance_id: entry.crm_instance_id },
      { sync_token: entry.sync_token, last_synced_at: entry.last_synced_at },
    )
    if (!saved) {
      ctx.log.warn(`No CRM calendar row for ${entry.calendar_id}; sync token not saved`)
    }
  }
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
    calendars: [...incoming.calendars],
    calendarIndex: incoming.calendarIndex ?? 0,
  }

  // The previous page has been upserted by now: its tokens are safe to save.
  await flushPendingSyncState(state.pendingSyncState, ctx)
  state.pendingSyncState = []

  const cascadeEntities = new Set(ctx.cascadeEntities ?? [])
  const itemsByEntity: Record<string, Record<string, unknown>[]> = {}

  if (!state.calendarsEmitted) {
    // Only create calendars the CRM does not have yet; existing rows keep
    // their metadata and the workplace's sync flags.
    const missing = state.calendars.filter((record) => !record.crm_instance_id)
    if (cascadeEntities.has('calendar') && missing.length > 0) {
      itemsByEntity.calendar = missing.map((record) => ({
        calendar: toCalendarEntityPayload(toCalendarSummary(record), record),
      }))
    }
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

  const calendar = state.calendars[state.calendarIndex] as GoogleCalendarRecord
  const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
  const useSyncToken = state.useSyncToken !== false
  const syncToken = useSyncToken ? calendar.sync_token : undefined
  const maxResults = ctx.limit > 0 ? ctx.limit : 100
  const windowInput = {
    timeMin: readBatchStringInput(ctx.input, 'time_min'),
    timeMax: readBatchStringInput(ctx.input, 'time_max'),
  }

  let page
  try {
    page = await listGoogleCalendarEvents(client, {
      calendarId: calendar.calendar_id,
      syncToken: syncToken || undefined,
      ...(syncToken ? {} : windowInput),
      pageToken: state.pageToken,
      maxResults,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'SYNC_TOKEN_INVALID') {
      // 410: the token expired. Restart this calendar with a full sync: no
      // sync token, and not the page token that belonged to the old listing.
      ctx.log.warn(`Sync token expired for ${calendar.calendar_id}; running a full sync`)
      state.calendars[state.calendarIndex] = { ...calendar, sync_token: null }
      state.pageToken = undefined
      state.nextSyncToken = undefined
      page = await listGoogleCalendarEvents(client, {
        calendarId: calendar.calendar_id,
        ...windowInput,
        maxResults,
      })
    } else if (isGoogleNotFound(error)) {
      // The calendar was deleted or unshared in Google: skip it.
      ctx.log.warn(`Calendar ${calendar.calendar_id} is no longer in Google; skipping`)
      state.pageToken = undefined
      state.nextSyncToken = undefined
      state.calendarIndex += 1
      return {
        items: [],
        itemsByEntity,
        pagination: { hasMore: state.calendarIndex < state.calendars.length, page: ctx.page },
        state: { ...state } as Record<string, unknown>,
      }
    } else {
      throw error
    }
  }

  const events: GoogleEventEntity[] = page.events
    .filter((googleEvent) => Boolean(googleEvent.id))
    .map((googleEvent) => normalizeGoogleCalendarEvent(googleEvent))

  let existing = new Map<string, ExistingEventRow>()
  if (cascadeEntities.has('calendar_event') && events.length > 0) {
    existing = await findCrmEventsByGoogleIds(eventLookupIds(events))
  }

  const eventItems: Record<string, unknown>[] = []
  const userItems: Record<string, unknown>[] = []
  const attendeeItems: Record<string, unknown>[] = []
  const seenUserEmails = new Set<string>()
  let skipped = 0

  for (const event of events) {
    const decision: EventUpsertDecision = cascadeEntities.has('calendar_event')
      ? decideEventUpsert(event, existing)
      : event.status === 'cancelled'
        ? { action: 'skip', reason: 'unknown_cancelled' }
        : { action: 'upsert' }

    if (decision.action === 'skip') {
      skipped += 1
      continue
    }

    if (decision.action === 'cancel') {
      eventItems.push({
        calendar_event: { ...decision.fields, calendar_id: calendar.calendar_id },
        calendar: { __crmMatch: calendar.calendar_id },
      })
      continue
    }

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

  const current = state.calendars[state.calendarIndex] as GoogleCalendarRecord
  if (page.nextPageToken) {
    state.pageToken = page.nextPageToken
  } else {
    const lastSyncedAt = new Date().toISOString()
    const nextSyncToken = state.nextSyncToken ?? current.sync_token ?? null
    state.calendars[state.calendarIndex] = {
      ...current,
      sync_token: nextSyncToken,
      last_synced_at: lastSyncedAt,
    }
    state.pendingSyncState = [
      {
        calendar_id: current.calendar_id,
        crm_instance_id: current.crm_instance_id ?? null,
        sync_token: nextSyncToken,
        last_synced_at: lastSyncedAt,
      },
    ]
    state.pageToken = undefined
    state.nextSyncToken = undefined
    state.calendarIndex += 1
  }

  const hasMore =
    state.calendarIndex < state.calendars.length || (state.pendingSyncState?.length ?? 0) > 0
  ctx.log.info(
    `Imported ${eventItems.length} events from ${calendar.calendar_id} (skipped=${skipped}, hasMore=${hasMore})`,
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
