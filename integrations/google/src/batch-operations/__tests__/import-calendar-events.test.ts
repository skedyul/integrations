import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarSummary } from '../../services/calendar/client'

type Row = Record<string, unknown>

const instanceList = jest.fn<
  (model: string, args?: { filter?: Record<string, unknown>; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()
const listGoogleCalendars = jest.fn<() => Promise<GoogleCalendarSummary[]>>()
const listGoogleCalendarEvents = jest.fn()

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return { ...actual, instance: { ...actual.instance, list: instanceList } }
})

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient: async () => ({ client: {} }),
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  listGoogleCalendars,
  listGoogleCalendarEvents,
}))

const { default: importCalendarEvents } = await import('../import-calendar-events')
const { default: importCalendars } = await import('../import-calendars')

function page(data: Row[]) {
  return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 50 } }
}

const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

function batchCtx(extras: Record<string, unknown>) {
  return {
    workplaceId: 'wp_1',
    appInstallationId: 'inst_1',
    appId: 'app_1',
    env: {},
    log,
    limit: 100,
    page: 1,
    cascadeEntities: ['calendar', 'calendar_event', 'user', 'attendee'],
    ...extras,
  } as never
}

const primary: GoogleCalendarSummary = {
  calendar_id: 'avin@skedyul.it',
  summary: 'Avin',
  primary: true,
  access_role: 'owner',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: null,
}
const room: GoogleCalendarSummary = {
  calendar_id: 'room@x',
  summary: 'Room',
  primary: false,
  access_role: 'reader',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: null,
}

describe('import_calendar_events', () => {
  beforeEach(() => {
    instanceList.mockReset()
    listGoogleCalendars.mockReset().mockResolvedValue([primary, room])
  })

  it('cascades calendar once, then people, events and attendees per page', () => {
    expect(importCalendarEvents.cascade).toEqual([
      { entity: 'calendar', order: 1, wave: 'setup' },
      { entity: 'user', order: 2, wave: 'page' },
      { entity: 'calendar_event', order: 3, wave: 'page' },
      { entity: 'attendee', order: 4, wave: 'page' },
    ])
  })

  it('a single-calendar (webhook) import starts from the CRM row and its stored sync token', async () => {
    instanceList.mockResolvedValue(
      page([{ id: 'ins_cal', google_calendar_id: 'avin@skedyul.it', sync_token: 'tok_stored' }]),
    )

    const result = await importCalendarEvents.setup!(
      batchCtx({ input: { calendar_id: 'avin@skedyul.it', use_sync_token: true } }),
    )

    expect(result).toMatchObject({
      state: {
        calendars: [{ calendar_id: 'avin@skedyul.it', crm_instance_id: 'ins_cal', sync_token: 'tok_stored' }],
        useSyncToken: true,
      },
    })
    expect(listGoogleCalendars).not.toHaveBeenCalled()
  })
})

describe('import_calendars', () => {
  beforeEach(() => {
    instanceList.mockReset()
    listGoogleCalendars.mockReset().mockResolvedValue([primary, room])
  })

  it('keeps existing sync flags and pages events for calendars the CRM has enabled', async () => {
    instanceList.mockResolvedValue(
      page([
        // The workplace turned the primary calendar off and the room on.
        { id: 'ins_primary', google_calendar_id: 'avin@skedyul.it', sync_enabled: false },
        { id: 'ins_room', google_calendar_id: 'room@x', sync_enabled: true },
      ]),
    )

    const setup = await importCalendars.setup!(batchCtx({}))
    const first = await importCalendars.iterate(
      batchCtx({ state: (setup as { state: Record<string, unknown> }).state }),
    )

    const calendars = (first as unknown as { itemsByEntity: { calendar: Array<{ calendar: Row }> } })
      .itemsByEntity.calendar
    for (const item of calendars) {
      expect(item.calendar).not.toHaveProperty('sync_enabled')
      expect(item.calendar).not.toHaveProperty('sync_direction')
    }
    const state = (first as unknown as { state: { calendars: Array<{ calendar_id: string }> } }).state
    expect(state.calendars.map((calendar) => calendar.calendar_id)).toEqual(['room@x'])
  })

  it('sets default flags (primary only) on calendars it creates', async () => {
    instanceList.mockResolvedValue(page([]))

    const setup = await importCalendars.setup!(batchCtx({}))
    const first = await importCalendars.iterate(
      batchCtx({ state: (setup as { state: Record<string, unknown> }).state }),
    )

    const calendars = (first as unknown as { itemsByEntity: { calendar: Array<{ calendar: Row }> } })
      .itemsByEntity.calendar
    expect(calendars.map((item) => item.calendar.sync_enabled)).toEqual([true, false])
    expect(calendars.map((item) => item.calendar.sync_direction)).toEqual(['both', 'both'])
  })
})
