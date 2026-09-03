import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarSummary } from '../../services/calendar/client'

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
      singleEvents?: boolean
    },
  ) => Promise<{
    events: Array<{
      id?: string | null
      status?: string | null
      summary?: string | null
      start?: { dateTime?: string }
      end?: { dateTime?: string }
    }>
    nextPageToken?: string | null
  }>
>()
const startAppBatchOperation = jest.fn()
const emitGoogleEvent = jest.fn()

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, upsertMany, isConfigured },
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

const { AppAuthInvalidError } = await import('skedyul')
const { calendarWindowPullRegistry } = await import('../calendar_window_pull')

const context = {
  appInstallationId: 'inst_1',
  env: {},
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

describe('calendar_window_pull', () => {
  beforeEach(() => {
    upsertMany.mockReset()
    isConfigured.mockReset().mockResolvedValue(true)
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    listGoogleCalendars.mockReset().mockResolvedValue([primary, room])
    listGoogleCalendarEvents.mockReset().mockResolvedValue({ events: [] })
    startAppBatchOperation.mockReset()
    emitGoogleEvent.mockReset()
  })

  it('upserts calendars then in-window events and does not start a batch', async () => {
    upsertMany.mockImplementation(async (modelHandle, items) => {
      if (modelHandle === 'calendar') {
        return {
          results: items.map((item, index) => ({
            id: `ins_cal_${index}`,
            google_calendar_id: String(item.google_calendar_id),
            mode: 'created' as const,
          })),
          errors: [],
        }
      }
      return {
        results: items.map((item, index) => ({
          id: `ins_evt_${index}`,
          google_event_id: String(item.google_event_id),
          mode: 'created' as const,
        })),
        errors: [],
      }
    })
    listGoogleCalendarEvents
      .mockResolvedValueOnce({
        events: [
          {
            id: 'evt_1',
            status: 'confirmed',
            summary: 'Room booking',
            start: { dateTime: '2026-09-03T01:00:00.000Z' },
            end: { dateTime: '2026-09-03T02:00:00.000Z' },
          },
        ],
      })
      .mockResolvedValueOnce({
        events: [
          {
            id: 'evt_2',
            status: 'cancelled',
            summary: 'Cancelled',
          },
        ],
      })

    const result = await calendarWindowPullRegistry.handler(
      {
        time_min: '2026-09-01T00:00:00.000Z',
        time_max: '2026-09-08T00:00:00.000Z',
      },
      context as never,
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toEqual({
        calendars_upserted: 2,
        events_upserted: 1,
        truncated: false,
        calendars: [
          { calendar_id: 'avin@skedyul.it', summary: 'avin@skedyul.it' },
          {
            calendar_id: 'room@group.calendar.google.com',
            summary: 'Room 2015',
          },
        ],
      })
    }

    expect(upsertMany.mock.calls[0]?.[0]).toBe('calendar')
    expect(upsertMany.mock.calls[0]?.[2]).toBe('google_calendar_id')
    expect(upsertMany.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({ sync_enabled: expect.anything() }),
      ]),
    )
    expect(upsertMany.mock.calls[1]?.[0]).toBe('calendar_event')
    expect(upsertMany.mock.calls[1]?.[1]).toEqual([
      expect.objectContaining({
        google_event_id: 'evt_1',
        calendar: 'ins_cal_0',
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

  it('filters to requested calendar_ids', async () => {
    upsertMany.mockResolvedValue({
      results: [
        {
          id: 'ins_room',
          google_calendar_id: 'room@group.calendar.google.com',
          mode: 'updated',
        },
      ],
      errors: [],
    })

    await calendarWindowPullRegistry.handler(
      {
        time_min: '2026-09-01T00:00:00.000Z',
        time_max: '2026-09-08T00:00:00.000Z',
        calendar_ids: ['room@group.calendar.google.com'],
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

  it('returns an auth error and does not upsert when Google is disconnected', async () => {
    getAuthenticatedOAuthClient.mockRejectedValue(
      new AppAuthInvalidError('Google account is not connected'),
    )

    const result = await calendarWindowPullRegistry.handler(
      {
        time_min: '2026-09-01T00:00:00.000Z',
        time_max: '2026-09-08T00:00:00.000Z',
      },
      context as never,
    )

    expect(result.success).toBe(false)
    expect(upsertMany).not.toHaveBeenCalled()
    expect(listGoogleCalendarEvents).not.toHaveBeenCalled()
  })

  it('marks truncated when a calendar has another page', async () => {
    upsertMany.mockResolvedValue({
      results: [
        {
          id: 'ins_primary',
          google_calendar_id: 'avin@skedyul.it',
          mode: 'updated',
        },
      ],
      errors: [],
    })
    listGoogleCalendars.mockResolvedValue([primary])
    listGoogleCalendarEvents.mockResolvedValue({
      events: [{ id: 'evt_1', status: 'confirmed', summary: 'One' }],
      nextPageToken: 'page_2',
    })

    const result = await calendarWindowPullRegistry.handler(
      {
        time_min: '2026-09-01T00:00:00.000Z',
        time_max: '2026-09-08T00:00:00.000Z',
      },
      context as never,
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.truncated).toBe(true)
    }
  })
})
