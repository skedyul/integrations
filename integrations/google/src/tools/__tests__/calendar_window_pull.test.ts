import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarSummary } from '../../services/calendar/client'

type Row = Record<string, unknown>

const upsertMany = jest.fn<
  (
    modelHandle: string,
    items: Record<string, unknown>[],
    matchField: string,
  ) => Promise<{
    results: Array<Record<string, unknown> & { mode: 'created' | 'updated' }>
    errors: Array<{ index: number; error: string }>
  }>
>()
const isConfigured = jest.fn<(modelHandle: string) => Promise<boolean>>()
const instanceList = jest.fn<
  (modelHandle: string, args?: { filter?: Record<string, unknown>; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()
const cronSubscribe = jest.fn(async (params: { toolName: string }) => ({
  id: `crsub_${params.toolName}`,
  toolName: params.toolName,
  schedule: '',
  timezone: 'UTC',
}))
const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()
const listGoogleCalendars = jest.fn<() => Promise<GoogleCalendarSummary[]>>()
const listGoogleCalendarEvents = jest.fn<
  (
    auth: object,
    options: {
      calendarId: string
      timeMin?: string
      timeMax?: string
      maxResults?: number
      pageToken?: string
      singleEvents?: boolean
    },
  ) => Promise<{
    events: Array<Record<string, unknown>>
    nextPageToken?: string | null
  }>
>()
const startAppBatchOperation = jest.fn()
const emitGoogleEvent = jest.fn()

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, upsertMany, isConfigured, list: instanceList },
    cron: { ...actual.cron, subscribe: cronSubscribe },
    isRuntimeContext: () => true,
  }
})

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  listGoogleCalendars,
  listGoogleCalendarEvents,
}))

jest.unstable_mockModule('../../lib/start-app-batch-operation.ts', () => ({
  startAppBatchOperation,
}))

jest.unstable_mockModule('../../lib/emit-google-event.ts', () => ({
  emitGoogleEvent,
}))

const ensureCalendarWatchesOnce = jest.fn(async (_appInstallationId: string, _auth: unknown) => undefined)
jest.unstable_mockModule('../../lib/calendar-watches.ts', () => ({
  ensureCalendarWatchesOnce,
}))

const { AppAuthInvalidError } = await import('skedyul')
const { calendarWindowPullRegistry, MAX_PAGES_PER_CALENDAR } = await import(
  '../calendar_window_pull'
)
const { skedyulGoogleEventId } = await import('../../services/calendar/event-ids')

const context = {
  appInstallationId: 'inst_1',
  env: {},
}

const windowInput = {
  window: {
    startAt: '2026-09-01T00:00:00.000Z',
    endAt: '2026-09-08T00:00:00.000Z',
    timezone: 'Pacific/Auckland',
  },
  model: { id: 'mdl_event', handle: 'event' },
  entity: { handle: 'calendar_event' },
}

const room: GoogleCalendarSummary = {
  calendar_id: 'room@group.calendar.google.com',
  summary: 'Room 2015',
  primary: false,
  access_role: 'reader',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: '#ffad46',
}

const primary: GoogleCalendarSummary = {
  calendar_id: 'avin@skedyul.it',
  summary: 'avin@skedyul.it',
  primary: true,
  access_role: 'owner',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: '#9fe1e7',
}

/** CRM state for instance.list: calendar rows and event rows by google id. */
let crmCalendars: Row[] = []
let crmEvents: Row[] = []

function page(data: Row[]) {
  return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 100 } }
}

function eventUpserts(): Record<string, unknown>[] {
  const call = upsertMany.mock.calls.find((entry) => entry[0] === 'calendar_event')
  return call?.[1] ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outputOf(result: unknown): any {
  expect((result as { success?: boolean }).success).toBe(true)
  return (result as { output?: unknown }).output
}

describe('calendar_window_pull', () => {
  it('declares a 60s timeout so Lambda MCP calls are not aborted at 10s', () => {
    expect(calendarWindowPullRegistry.timeout).toBe(60_000)
  })

  beforeEach(() => {
    crmCalendars = []
    crmEvents = []
    ensureCalendarWatchesOnce.mockClear()
    cronSubscribe.mockClear()
    upsertMany.mockReset().mockImplementation(async (modelHandle, items) => ({
      results: items.map((item, index) => ({
        id:
          modelHandle === 'calendar'
            ? `ins_cal_${String(item.google_calendar_id)}`
            : `ins_evt_${index}`,
        ...(modelHandle === 'calendar'
          ? { google_calendar_id: String(item.google_calendar_id) }
          : { google_event_id: String(item.google_event_id) }),
        mode: 'created' as const,
      })),
      errors: [],
    }))
    isConfigured.mockReset().mockResolvedValue(true)
    instanceList.mockReset().mockImplementation(async (modelHandle, args) => {
      if (modelHandle === 'calendar') return page(crmCalendars)
      const ids = (args?.filter?.google_event_id as { in?: string[] } | undefined)?.in ?? []
      return page(crmEvents.filter((row) => ids.includes(String(row.google_event_id))))
    })
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    listGoogleCalendars.mockReset().mockResolvedValue([primary, room])
    listGoogleCalendarEvents.mockReset().mockResolvedValue({ events: [] })
    startAppBatchOperation.mockReset()
    emitGoogleEvent.mockReset()
  })

  it('upserts calendars then in-window events with etag and updated_at, without a batch', async () => {
    listGoogleCalendarEvents
      .mockResolvedValueOnce({
        events: [
          {
            id: 'evt_1',
            status: 'confirmed',
            summary: 'Room booking',
            start: { dateTime: '2026-09-03T01:00:00.000Z' },
            end: { dateTime: '2026-09-03T02:00:00.000Z' },
            updated: '2026-08-30T00:00:00.000Z',
            etag: '"e1"',
          },
        ],
      })
      .mockResolvedValueOnce({
        events: [{ id: 'evt_2', status: 'cancelled', summary: 'Cancelled' }],
      })

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(outputOf(result)).toEqual({
      calendars_upserted: 2,
      events_upserted: 1,
      events_cancelled: 0,
      events_skipped: 1,
      calendars_skipped: 0,
      truncated: false,
      calendars: [
        { calendar_id: 'avin@skedyul.it', summary: 'avin@skedyul.it' },
        { calendar_id: 'room@group.calendar.google.com', summary: 'Room 2015' },
      ],
    })
    expect(eventUpserts()).toEqual([
      expect.objectContaining({
        google_event_id: 'evt_1',
        calendar: 'ins_cal_avin@skedyul.it',
        updated_at: '2026-08-30T00:00:00.000Z',
        etag: '"e1"',
      }),
    ])
    expect(listGoogleCalendarEvents).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        calendarId: 'avin@skedyul.it',
        timeMin: '2026-09-01T00:00:00.000Z',
        timeMax: '2026-09-08T00:00:00.000Z',
        singleEvents: false,
      }),
    )
    expect(startAppBatchOperation).not.toHaveBeenCalled()
    expect(emitGoogleEvent).not.toHaveBeenCalled()
  })

  it('sets sync flags only on calendars it creates and never resets existing ones', async () => {
    crmCalendars = [
      { id: 'ins_primary', google_calendar_id: 'avin@skedyul.it', sync_enabled: true, sync_direction: 'pull' },
    ]

    await calendarWindowPullRegistry.handler(windowInput, context as never)

    const calendarPayloads = upsertMany.mock.calls[0]?.[1] ?? []
    const existing = calendarPayloads.find((item) => item.google_calendar_id === 'avin@skedyul.it')
    const created = calendarPayloads.find(
      (item) => item.google_calendar_id === 'room@group.calendar.google.com',
    )
    expect(existing).not.toHaveProperty('sync_direction')
    expect(existing).not.toHaveProperty('sync_enabled')
    expect(created).toMatchObject({ sync_direction: 'both' })
    expect(created).not.toHaveProperty('sync_enabled')
  })

  it('does not pull events for calendars whose CRM row has sync disabled', async () => {
    crmCalendars = [
      { id: 'ins_room', google_calendar_id: 'room@group.calendar.google.com', sync_enabled: false },
    ]

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(listGoogleCalendarEvents).toHaveBeenCalledTimes(1)
    expect(listGoogleCalendarEvents.mock.calls[0]?.[1]).toMatchObject({
      calendarId: 'avin@skedyul.it',
    })
    expect(outputOf(result).calendars_skipped).toBe(1)
  })

  it('reads every page of a calendar', async () => {
    listGoogleCalendars.mockResolvedValue([primary])
    listGoogleCalendarEvents
      .mockResolvedValueOnce({ events: [{ id: 'evt_a', status: 'confirmed' }], nextPageToken: 'p2' })
      .mockResolvedValueOnce({ events: [{ id: 'evt_b', status: 'confirmed' }], nextPageToken: null })

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(listGoogleCalendarEvents).toHaveBeenCalledTimes(2)
    expect(listGoogleCalendarEvents.mock.calls[1]?.[1]).toMatchObject({ pageToken: 'p2' })
    expect(eventUpserts().map((item) => item.google_event_id)).toEqual(['evt_a', 'evt_b'])
    expect(outputOf(result).truncated).toBe(false)
  })

  it('stops at the page bound and reports truncated', async () => {
    listGoogleCalendars.mockResolvedValue([primary])
    listGoogleCalendarEvents.mockResolvedValue({
      events: [{ id: 'evt_1', status: 'confirmed', summary: 'One' }],
      nextPageToken: 'more',
    })

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(listGoogleCalendarEvents).toHaveBeenCalledTimes(MAX_PAGES_PER_CALENDAR)
    expect(outputOf(result).truncated).toBe(true)
  })

  it('applies cancellations: marks known rows, stores cancelled occurrences, ignores unknown events', async () => {
    listGoogleCalendars.mockResolvedValue([primary])
    crmEvents = [
      { id: 'ins_single', google_event_id: 'single_1', updated_at: '2026-08-01T00:00:00.000Z' },
      { id: 'ins_master', google_event_id: 'master_1', updated_at: '2026-08-01T00:00:00.000Z' },
    ]
    listGoogleCalendarEvents.mockResolvedValue({
      events: [
        { id: 'single_1', status: 'cancelled', updated: '2026-09-02T00:00:00.000Z' },
        {
          id: 'master_1_20260903T010000Z',
          status: 'cancelled',
          recurringEventId: 'master_1',
          originalStartTime: { dateTime: '2026-09-03T01:00:00Z' },
          updated: '2026-09-02T00:00:00.000Z',
        },
        { id: 'never_seen', status: 'cancelled' },
      ],
    })

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(eventUpserts()).toEqual([
      {
        google_event_id: 'single_1',
        status: 'cancelled',
        updated_at: '2026-09-02T00:00:00.000Z',
        etag: null,
        calendar_id: 'avin@skedyul.it',
        calendar: 'ins_cal_avin@skedyul.it',
      },
      expect.objectContaining({
        google_event_id: 'master_1_20260903T010000Z',
        status: 'cancelled',
        recurring_event_id: 'master_1',
        original_start: '2026-09-03T01:00:00Z',
      }),
    ])
    expect(eventUpserts()[0]).not.toHaveProperty('summary')
    expect(outputOf(result)).toMatchObject({ events_cancelled: 2, events_skipped: 1 })
  })

  it('does not overwrite a row whose stored updated_at is as new as Google', async () => {
    listGoogleCalendars.mockResolvedValue([primary])
    crmEvents = [
      { id: 'ins_1', google_event_id: 'evt_1', updated_at: '2026-09-02T00:00:00.000Z' },
    ]
    listGoogleCalendarEvents.mockResolvedValue({
      events: [
        { id: 'evt_1', status: 'confirmed', summary: 'Old copy', updated: '2026-09-01T00:00:00.000Z' },
      ],
    })

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(eventUpserts()).toEqual([])
    expect(outputOf(result).events_skipped).toBe(1)
  })

  it('skips a Skedyul-created event whose write-back has not landed', async () => {
    listGoogleCalendars.mockResolvedValue([primary])
    listGoogleCalendarEvents.mockResolvedValue({
      events: [{ id: skedyulGoogleEventId('ins_new'), status: 'confirmed', summary: 'Fresh' }],
    })

    await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(eventUpserts()).toEqual([])
  })

  it('opens missing push channels and subscribes no schedules', async () => {
    await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(ensureCalendarWatchesOnce).toHaveBeenCalledWith('inst_1', expect.anything())
    expect(cronSubscribe).not.toHaveBeenCalled()
  })

  it('filters to requested calendar_ids', async () => {
    await calendarWindowPullRegistry.handler(
      {
        ...windowInput,
        calendars: { ids: ['room@group.calendar.google.com'] },
      },
      context as never,
    )

    expect(upsertMany.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        google_calendar_id: 'room@group.calendar.google.com',
      }),
    ])
    expect(listGoogleCalendarEvents).toHaveBeenCalledTimes(1)
    expect(listGoogleCalendarEvents.mock.calls[0]?.[1]).toMatchObject({
      calendarId: 'room@group.calendar.google.com',
    })
  })

  it('returns a validation error when calendar CRM maps are not configured', async () => {
    isConfigured.mockImplementation(async (handle) => handle !== 'calendar')

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Calendar CRM maps are not configured for this installation',
      },
    })
    expect(upsertMany).not.toHaveBeenCalled()
    expect(getAuthenticatedOAuthClient).not.toHaveBeenCalled()
  })

  it('returns an auth error and does not upsert when Google is disconnected', async () => {
    getAuthenticatedOAuthClient.mockRejectedValue(
      new AppAuthInvalidError('Google account is not connected'),
    )

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(result.success).toBe(false)
    expect(upsertMany).not.toHaveBeenCalled()
    expect(listGoogleCalendarEvents).not.toHaveBeenCalled()
  })

  it('returns RATE_LIMITED when Google rate-limits the pull', async () => {
    listGoogleCalendarEvents.mockRejectedValue(
      Object.assign(new Error('Too Many Requests'), {
        status: 429,
        response: { status: 429, headers: { 'retry-after': '30' } },
      }),
    )

    const result = await calendarWindowPullRegistry.handler(windowInput, context as never)

    expect(result).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED' },
      retry: { allowed: true, afterMs: 30_000 },
    })
  })
})
