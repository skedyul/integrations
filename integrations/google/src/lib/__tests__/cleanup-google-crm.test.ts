import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type Row = Record<string, unknown>

const deleteMany = jest.fn<
  (model: string, options: unknown) => Promise<{ deleted: string[]; errors: Array<{ index: number; error: string }> }>
>()
const updateMany = jest.fn<
  (model: string, items: Array<{ id: string; data: Row }>) => Promise<{ updated: Row[]; errors: Array<{ index: number; error: string }> }>
>()
const list = jest.fn<
  (model: string, args?: { filter?: Record<string, unknown>; page?: number; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()

jest.unstable_mockModule('skedyul', () => ({
  instance: { deleteMany, updateMany, list },
}))

const { cleanupGoogleCrmRows } = await import('../cleanup-google-crm')
const { skedyulGoogleEventId } = await import('../../services/calendar/event-ids')

const SK_MASTER = skedyulGoogleEventId('ins_native_series')

let events: Row[] = []
let calendars: Row[] = []

function page(data: Row[]) {
  return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 200 } }
}

describe('cleanupGoogleCrmRows', () => {
  const log = { info: jest.fn(), warn: jest.fn() }

  beforeEach(() => {
    events = [
      { id: 'ins_imported', google_event_id: 'abc123', google_calendar_id: 'room' },
      { id: 'ins_native_series', google_event_id: SK_MASTER, google_calendar_id: 'primary', calendar: 'ins_cal_primary' },
      { id: 'ins_native_exception', google_event_id: `${SK_MASTER}_20260901T090000Z`, recurring_event_id: SK_MASTER },
      { id: 'ins_unpushed_exception', recurring_event_id: SK_MASTER },
      { id: 'ins_never_synced', summary: 'Local only' },
    ]
    calendars = [
      { id: 'ins_cal_primary', google_calendar_id: 'primary', sync_token: 'tok', watch_channel_id: 'ch' },
      { id: 'ins_cal_room', google_calendar_id: 'room' },
    ]
    log.info.mockClear()
    log.warn.mockClear()
    deleteMany.mockReset().mockImplementation(async (model, options) => {
      const ids = (options as { ids?: string[] }).ids
      if (ids) {
        if (model === 'calendar_event') events = events.filter((row) => !ids.includes(String(row.id)))
        return { deleted: ids, errors: [] }
      }
      return { deleted: ['ins_attendee_1'], errors: [] }
    })
    updateMany.mockReset().mockImplementation(async (_model, items) => ({
      updated: items.map((item) => ({ id: item.id })),
      errors: [],
    }))
    list.mockReset().mockImplementation(async (model, args) => {
      const filter = args?.filter ?? {}
      if (model === 'calendar') return page(calendars)
      if ('google_event_id' in filter) return page(events.filter((row) => row.google_event_id))
      if ('recurring_event_id' in filter) {
        const ids = (filter.recurring_event_id as { in: string[] }).in
        return page(events.filter((row) => ids.includes(String(row.recurring_event_id))))
      }
      if ('calendar' in filter) {
        const id = (filter.calendar as { eq: string }).eq
        return page(events.filter((row) => row.calendar === id))
      }
      if ('calendar_id' in filter) {
        const id = (filter.calendar_id as { eq: string }).eq
        return page(events.filter((row) => row.google_calendar_id === id))
      }
      return page([])
    })
  })

  it('deletes imported rows and keeps Skedyul-created events without their Google link', async () => {
    const result = await cleanupGoogleCrmRows(log)

    expect(deleteMany).toHaveBeenCalledWith('attendee', {
      filter: { event_attendee_key: { isNotEmpty: true } },
    })
    expect(deleteMany).toHaveBeenCalledWith('calendar_event', { ids: ['ins_imported'] })

    const eventUpdates = updateMany.mock.calls.find((call) => call[0] === 'calendar_event')?.[1]
    expect(eventUpdates).toEqual([
      {
        id: 'ins_native_series',
        data: { google_event_id: null, html_link: null, etag: null, updated_at: null },
      },
      {
        id: 'ins_native_exception',
        data: {
          google_event_id: null,
          html_link: null,
          etag: null,
          updated_at: null,
          // Re-pointed at the master's CRM id: its Google id is gone.
          recurring_event_id: 'ins_native_series',
        },
      },
      { id: 'ins_unpushed_exception', data: { recurring_event_id: 'ins_native_series' } },
    ])
    expect(result).toMatchObject({
      deletedByEntity: { attendee: 1, calendar_event: 1, calendar: 1 },
      strippedEvents: 3,
      keptCalendars: 1,
    })
  })

  it('keeps calendars Skedyul events still use (clearing sync state) and deletes the rest', async () => {
    await cleanupGoogleCrmRows(log)

    expect(updateMany).toHaveBeenCalledWith('calendar', [
      {
        id: 'ins_cal_primary',
        data: {
          sync_token: null,
          last_synced_at: null,
          watch_channel_id: null,
          watch_resource_id: null,
          watch_expiration: null,
          watch_token: null,
        },
      },
    ])
    expect(deleteMany).toHaveBeenCalledWith('calendar', { ids: ['ins_cal_room'] })
  })

  it('never touches events that have no Google id', async () => {
    await cleanupGoogleCrmRows(log)

    const touched = updateMany.mock.calls.flatMap((call) => call[1].map((item) => item.id))
    const deleted = deleteMany.mock.calls.flatMap((call) => (call[1] as { ids?: string[] }).ids ?? [])
    expect(touched).not.toContain('ins_never_synced')
    expect(deleted).not.toContain('ins_never_synced')
  })

  it('keeps going when an entity is not mapped', async () => {
    deleteMany.mockRejectedValueOnce(new Error('attendee not mapped'))

    const result = await cleanupGoogleCrmRows(log)

    expect(result.deletedByEntity.attendee).toBe(0)
    expect(result.deletedByEntity.calendar_event).toBe(1)
    expect(log.warn).toHaveBeenCalled()
  })
})
