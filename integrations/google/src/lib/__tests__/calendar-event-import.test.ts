import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

type Row = Record<string, unknown>

const instanceList = jest.fn<
  (model: string, args?: { filter?: Record<string, unknown>; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()
const instanceUpdate = jest.fn<(model: string, id: string, data: Row) => Promise<Row>>()
const listGoogleCalendarEvents = jest.fn<
  (
    auth: object,
    options: { calendarId: string; syncToken?: string; pageToken?: string; timeMin?: string },
  ) => Promise<{
    events: Array<Record<string, unknown>>
    nextPageToken?: string | null
    nextSyncToken?: string | null
  }>
>()

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, list: instanceList, update: instanceUpdate },
  }
})

jest.unstable_mockModule('../google_client.ts', () => ({
  getAuthenticatedOAuthClient: async () => ({ client: {} }),
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  listGoogleCalendarEvents,
}))

const { iterateCalendarEventImport, readBatchStringInput, toCalendarSummary } = await import(
  '../calendar-event-import'
)

function page(data: Row[]) {
  return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 100 } }
}

const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

const linked: GoogleCalendarRecord = {
  id: 'ins_cal',
  calendar_id: 'primary',
  crm_instance_id: 'ins_cal',
  sync_enabled: true,
  sync_token: 'tok_stored',
}

function ctx(state: Record<string, unknown>, extras: Record<string, unknown> = {}) {
  return {
    workplaceId: 'wp_1',
    appInstallationId: 'inst_1',
    appId: 'app_1',
    env: {},
    log,
    limit: 100,
    page: 1,
    cascadeEntities: ['calendar', 'calendar_event', 'user', 'attendee'],
    state,
    ...extras,
  } as never
}

let crmEvents: Row[] = []

describe('iterateCalendarEventImport', () => {
  beforeEach(() => {
    crmEvents = []
    instanceList.mockReset().mockImplementation(async (_model, args) => {
      const ids = (args?.filter?.google_event_id as { in?: string[] } | undefined)?.in ?? []
      return page(crmEvents.filter((row) => ids.includes(String(row.google_event_id))))
    })
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    listGoogleCalendarEvents.mockReset()
    log.warn.mockClear()
  })

  it('lists incrementally with the stored sync token', async () => {
    listGoogleCalendarEvents.mockResolvedValue({ events: [], nextPageToken: 'p2' })

    await iterateCalendarEventImport(
      ctx({ calendars: [linked], calendarIndex: 0, calendarsEmitted: true, useSyncToken: true }),
    )

    expect(listGoogleCalendarEvents.mock.calls[0]?.[1]).toMatchObject({
      calendarId: 'primary',
      syncToken: 'tok_stored',
    })
  })

  it('saves the new sync token on the next iterate, after the last page was upserted', async () => {
    listGoogleCalendarEvents.mockResolvedValue({
      events: [{ id: 'evt_1', status: 'confirmed', summary: 'A' }],
      nextSyncToken: 'tok_next',
    })

    const last = await iterateCalendarEventImport(
      ctx({ calendars: [linked], calendarIndex: 0, calendarsEmitted: true, useSyncToken: true }),
    )

    // Not written yet: the platform has not upserted this page.
    expect(instanceUpdate).not.toHaveBeenCalled()
    expect(last.pagination.hasMore).toBe(true)
    expect(last.itemsByEntity?.calendar_event).toHaveLength(1)

    const finish = await iterateCalendarEventImport(ctx(last.state as Record<string, unknown>))

    expect(instanceUpdate).toHaveBeenCalledWith('calendar', 'ins_cal', {
      sync_token: 'tok_next',
      last_synced_at: expect.any(String),
    })
    expect(finish.pagination.hasMore).toBe(false)
    expect(finish.items).toEqual([])
    expect(listGoogleCalendarEvents).toHaveBeenCalledTimes(1)
  })

  it('looks up the CRM row by google_calendar_id when the record has no CRM id', async () => {
    instanceList.mockImplementation(async (model) =>
      model === 'calendar'
        ? page([{ id: 'ins_found', google_calendar_id: 'primary' }])
        : page([]),
    )

    await iterateCalendarEventImport(
      ctx({
        calendars: [{ ...linked, crm_instance_id: null }],
        calendarIndex: 1,
        calendarsEmitted: true,
        pendingSyncState: [
          {
            calendar_id: 'primary',
            crm_instance_id: null,
            sync_token: 'tok_x',
            last_synced_at: '2026-09-01T00:00:00.000Z',
          },
        ],
      }),
    )

    expect(instanceUpdate).toHaveBeenCalledWith('calendar', 'ins_found', {
      sync_token: 'tok_x',
      last_synced_at: '2026-09-01T00:00:00.000Z',
    })
  })

  it('restarts a full sync after 410 without the sync token or the stale page token', async () => {
    listGoogleCalendarEvents
      .mockRejectedValueOnce(new Error('SYNC_TOKEN_INVALID'))
      .mockResolvedValueOnce({ events: [], nextSyncToken: 'tok_fresh' })

    const result = await iterateCalendarEventImport(
      ctx(
        {
          calendars: [linked],
          calendarIndex: 0,
          calendarsEmitted: true,
          useSyncToken: true,
          pageToken: 'stale_page',
        },
        { input: { time_min: '2026-01-01T00:00:00.000Z' } },
      ),
    )

    expect(listGoogleCalendarEvents.mock.calls[0]?.[1]).toMatchObject({
      syncToken: 'tok_stored',
      pageToken: 'stale_page',
    })
    const retry = listGoogleCalendarEvents.mock.calls[1]?.[1]
    expect(retry).not.toHaveProperty('syncToken')
    expect(retry?.pageToken).toBeUndefined()
    expect(retry?.timeMin).toBe('2026-01-01T00:00:00.000Z')
    expect((result.state as { pendingSyncState: Array<{ sync_token: string }> }).pendingSyncState[0]?.sync_token).toBe('tok_fresh')
  })

  it('skips a calendar that no longer exists in Google', async () => {
    listGoogleCalendarEvents.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))

    const result = await iterateCalendarEventImport(
      ctx({ calendars: [linked], calendarIndex: 0, calendarsEmitted: true }),
    )

    expect(result.pagination.hasMore).toBe(false)
    expect((result.state as { calendarIndex: number }).calendarIndex).toBe(1)
  })

  it('applies cancellations without re-creating rows the CRM deleted', async () => {
    crmEvents = [{ id: 'ins_known', google_event_id: 'known', updated_at: '2026-08-01T00:00:00Z' }]
    listGoogleCalendarEvents.mockResolvedValue({
      events: [
        { id: 'known', status: 'cancelled', updated: '2026-09-01T00:00:00Z' },
        // Deleted in Skedyul, then in Google by the delete workflow: no row.
        { id: 'deleted_in_skedyul', status: 'cancelled', updated: '2026-09-01T00:00:00Z' },
      ],
    })

    const result = await iterateCalendarEventImport(
      ctx({ calendars: [linked], calendarIndex: 0, calendarsEmitted: true }),
    )

    expect(result.itemsByEntity?.calendar_event).toEqual([
      {
        calendar_event: {
          google_event_id: 'known',
          status: 'cancelled',
          updated_at: '2026-09-01T00:00:00Z',
          etag: null,
          calendar_id: 'primary',
        },
        calendar: { __crmMatch: 'primary' },
      },
    ])
  })

  it('creates calendar rows on the first page only for calendars the CRM lacks', async () => {
    listGoogleCalendarEvents.mockResolvedValue({ events: [] })
    const fromGoogle: GoogleCalendarRecord = {
      id: 'room',
      calendar_id: 'room',
      crm_instance_id: null,
      summary: 'Room',
      timezone: 'Pacific/Auckland',
      primary: false,
    }

    const result = await iterateCalendarEventImport(
      ctx({ calendars: [linked, fromGoogle], calendarIndex: 0, calendarsEmitted: false }),
    )

    expect(result.itemsByEntity?.calendar).toEqual([
      {
        calendar: expect.objectContaining({
          google_calendar_id: 'room',
          timezone: 'Pacific/Auckland',
          sync_direction: 'both',
        }),
      },
    ])
  })
})

describe('toCalendarSummary', () => {
  it('maps a CRM calendar record onto a Google list summary', () => {
    expect(
      toCalendarSummary({
        id: 'ins_1',
        calendar_id: 'primary',
        google_calendar_id: 'primary',
        summary: 'Work',
        primary: true,
        timezone: 'Australia/Sydney',
        color: '#fff',
        description: null,
      }),
    ).toEqual({
      calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      access_role: null,
      time_zone: 'Australia/Sydney',
      description: null,
      color: '#fff',
    })
  })
})

describe('readBatchStringInput', () => {
  it('returns non-empty string values and ignores the rest', () => {
    expect(readBatchStringInput({ calendar_id: 'primary' }, 'calendar_id')).toBe('primary')
    expect(readBatchStringInput({ calendar_id: '' }, 'calendar_id')).toBeUndefined()
    expect(readBatchStringInput({ calendar_id: 1 }, 'calendar_id')).toBeUndefined()
    expect(readBatchStringInput(undefined, 'calendar_id')).toBeUndefined()
  })
})
