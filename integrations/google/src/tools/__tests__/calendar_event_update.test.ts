import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

type Event = Record<string, unknown>

const instanceGet = jest.fn<(model: string, id: string) => Promise<Record<string, unknown> | null>>()
const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()
const loadGoogleCalendarRecord =
  jest.fn<(calendarId: string, env: unknown) => Promise<GoogleCalendarRecord | null>>()
const insertGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const patchGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const getGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const moveGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const createGoogleEvent = jest.fn(async () => ({ emitted: true }))

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, get: instanceGet },
    isRuntimeContext: () => true,
  }
})

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
  mapGoogleAuthError: (error: unknown) => error,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  insertGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  getGoogleCalendarEvent,
  moveGoogleCalendarEvent,
  deleteGoogleCalendarEvent: jest.fn(),
}))

jest.unstable_mockModule('../../lib/create-google-event.ts', () => ({
  createGoogleEvent,
}))

const { calendarEventUpdateRegistry, planCalendarEventWrite } = await import(
  '../calendar_event_update'
)
const { skedyulGoogleEventId } = await import('../../services/calendar/event-ids')

const context = { appInstallationId: 'inst_1', env: {} } as never

function parse(raw: Record<string, unknown>): never {
  const schema = calendarEventUpdateRegistry.inputSchema as unknown as {
    parse: (value: unknown) => never
  }
  return schema.parse(raw)
}

function run(raw: Record<string, unknown>) {
  return calendarEventUpdateRegistry.handler(parse(raw), context)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outputOf(result: unknown): any {
  expect((result as { success?: boolean }).success).toBe(true)
  return (result as { output?: unknown }).output
}

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

const CAL = 'team@group.calendar.google.com'

const row = {
  google_event_id: 'evt_1',
  summary: 'Standup',
  description: 'Daily',
  location: 'Room A',
  start: '2026-08-24T09:00:00.000Z',
  end: '2026-08-24T09:30:00.000Z',
  timezone: 'Australia/Sydney',
  status: 'confirmed',
  etag: '"e1"',
}

describe('planCalendarEventWrite', () => {
  it('patches only changed fields with the stored etag', () => {
    const plan = planCalendarEventWrite(
      parse({ calendar_id: CAL, before: row, after: { ...row, summary: 'Planning' } }),
    )
    expect(plan).toEqual({
      kind: 'patch',
      eventId: 'evt_1',
      body: { calendar_id: CAL, event_id: 'evt_1', summary: 'Planning', send_updates: undefined },
      etag: '"e1"',
      movable: true,
    })
  })

  it('sends cleared description and attendees as cleared', () => {
    const plan = planCalendarEventWrite(
      parse({
        calendar_id: CAL,
        before: { ...row, attendees: ['ada@example.com'] },
        after: { ...row, description: null, attendees: [] },
      }),
    )
    expect(plan).toMatchObject({
      kind: 'patch',
      body: { description: '', attendees: [] },
    })
  })

  it('sends a master recurrence change (UNTIL / EXDATE) verbatim', () => {
    const before = { ...row, recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'] }
    const plan = planCalendarEventWrite(
      parse({
        calendar_id: CAL,
        before,
        after: {
          ...before,
          recurrence: [
            'RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260930T000000Z',
            'EXDATE:20260907T090000Z',
          ],
        },
      }),
    )
    expect(plan).toMatchObject({
      kind: 'patch',
      eventId: 'evt_1',
      body: {
        recurrence: [
          'RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260930T000000Z',
          'EXDATE:20260907T090000Z',
        ],
      },
    })
  })

  it('applies a never-pushed exception to its series occurrence with every field, ignoring a cloned master etag', () => {
    const exception = {
      summary: 'Moved standup',
      start: '2026-08-31T10:00:00.000Z',
      end: '2026-08-31T10:30:00.000Z',
      recurring_event_id: 'master123',
      original_start: '2026-08-31T09:00:00.000Z',
      etag: '"master-etag"',
      html_link: 'https://master',
    }
    const plan = planCalendarEventWrite(
      parse({ calendar_id: CAL, before: exception, after: { ...exception, location: 'Room B' } }),
    )
    expect(plan).toEqual({
      kind: 'instance',
      recurringEventId: 'master123',
      originalStart: '2026-08-31T09:00:00.000Z',
      allDay: undefined,
      body: {
        summary: 'Moved standup',
        location: 'Room B',
        start: '2026-08-31T10:00:00.000Z',
        end: '2026-08-31T10:30:00.000Z',
        send_updates: undefined,
      },
    })
  })

  it('re-applies an exception to the new series after a "this and following" split', () => {
    const before = {
      google_event_id: 'old_20261005T090000Z',
      summary: 'Special',
      start: '2026-10-05T11:00:00.000Z',
      end: '2026-10-05T12:00:00.000Z',
      recurring_event_id: 'old',
      original_start: '2026-10-05T09:00:00.000Z',
    }
    const plan = planCalendarEventWrite(
      parse({
        calendar_id: CAL,
        before,
        after: { ...before, recurring_event_id: 'ins_new_series' },
      }),
    )
    expect(plan).toMatchObject({
      kind: 'instance',
      recurringEventId: 'ins_new_series',
      body: { summary: 'Special', start: '2026-10-05T11:00:00.000Z' },
    })
  })

  it('patches a pushed exception by its own id when its series slot is unchanged', () => {
    const exception = {
      google_event_id: 'master123_20260831T090000Z',
      summary: 'Moved',
      recurring_event_id: 'master123',
      original_start: '2026-08-31T09:00:00.000Z',
      etag: '"inst"',
    }
    const plan = planCalendarEventWrite(
      parse({ calendar_id: CAL, before: exception, after: { ...exception, summary: 'Moved again' } }),
    )
    expect(plan).toMatchObject({
      kind: 'patch',
      eventId: 'master123_20260831T090000Z',
      etag: '"inst"',
      movable: false,
    })
  })

  it('inserts a row without a Google id using the deterministic id', () => {
    const { google_event_id: _id, etag: _etag, ...unsynced } = row
    const plan = planCalendarEventWrite(
      parse({ calendar_id: CAL, crm_instance_id: 'ins_9', before: unsynced, after: unsynced }),
    )
    expect(plan).toMatchObject({
      kind: 'insert',
      eventId: skedyulGoogleEventId('ins_9'),
      body: { calendar_id: CAL, summary: 'Standup' },
    })
  })

  it('targets the resolved calendar even when the event string still names the old one', () => {
    const plan = planCalendarEventWrite(
      parse({
        calendar_id: 'new@group.calendar.google.com',
        before: { ...row, calendar_id: 'old@group.calendar.google.com' },
        after: { ...row, calendar_id: 'old@group.calendar.google.com' },
      }),
    )
    expect(plan).toEqual({ kind: 'get', eventId: 'evt_1', movable: true })
  })
})

describe('calendar_event_update handler', () => {
  const calendarRecord: GoogleCalendarRecord = {
    id: 'ins_cal',
    calendar_id: CAL,
    summary: 'Team',
    timezone: 'Australia/Melbourne',
  }

  beforeEach(() => {
    instanceGet.mockReset()
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    loadGoogleCalendarRecord.mockReset().mockResolvedValue(calendarRecord)
    insertGoogleCalendarEvent.mockReset()
    patchGoogleCalendarEvent.mockReset()
    getGoogleCalendarEvent.mockReset()
    moveGoogleCalendarEvent.mockReset()
    createGoogleEvent.mockClear()
  })

  it('patches with If-Match and asks for a writeback, without emitting inbound events', async () => {
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'evt_1', etag: '"e2"', status: 'confirmed' })

    const result = await run({
      calendar_id: CAL,
      before: row,
      after: { ...row, summary: 'Planning' },
      emit_event: 'false',
    })

    expect(patchGoogleCalendarEvent.mock.calls[0]?.[4]).toEqual({ ifMatch: '"e1"' })
    expect(outputOf(result)).toMatchObject({ write: 'patch', writeback: true, moved: false })
    expect(outputOf(result).event.etag).toBe('"e2"')
    expect(createGoogleEvent).not.toHaveBeenCalled()
  })

  it('moves the event with events.move when the calendar changed, then patches on the new calendar', async () => {
    instanceGet.mockResolvedValue({ id: 'ins_old_cal', google_calendar_id: 'old@group.calendar.google.com' })
    moveGoogleCalendarEvent.mockResolvedValue({ id: 'evt_1', etag: '"moved"' })
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'evt_1', etag: '"e3"' })

    const result = await run({
      calendar_id: CAL,
      previous_calendar_instance_id: 'ins_old_cal',
      before: row,
      after: { ...row, summary: 'Planning' },
    })

    expect(moveGoogleCalendarEvent).toHaveBeenCalledWith(
      {},
      'old@group.calendar.google.com',
      'evt_1',
      CAL,
      undefined,
    )
    expect(patchGoogleCalendarEvent.mock.calls[0]?.[1]).toBe(CAL)
    expect(patchGoogleCalendarEvent.mock.calls[0]?.[4]).toEqual({ ifMatch: '"moved"' })
    expect(outputOf(result)).toMatchObject({ moved: true, writeback: true })
  })

  it('treats a cancellation of an occurrence that is already gone as done', async () => {
    patchGoogleCalendarEvent.mockRejectedValue(httpError(404))

    const exception = {
      google_event_id: 'master123_20261005T090000Z',
      recurring_event_id: 'master123',
      original_start: '2026-10-05T09:00:00.000Z',
      status: 'confirmed',
    }
    const result = await run({
      calendar_id: CAL,
      before: exception,
      after: { ...exception, status: 'cancelled' },
      calendar_edit: '{"action":"delete","scope":"following"}',
    })

    expect(outputOf(result)).toMatchObject({ write: 'gone', writeback: false })
  })

  it('surfaces a 404 for an ordinary edit', async () => {
    patchGoogleCalendarEvent.mockRejectedValue(httpError(404))

    const result = await run({ calendar_id: CAL, before: row, after: { ...row, summary: 'X' } })

    expect(result).toMatchObject({ success: false })
  })

  it('inserts a recurring row with the calendar time zone and writes back after a 409 retry', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(httpError(409))
    getGoogleCalendarEvent.mockResolvedValue({
      id: skedyulGoogleEventId('ins_9'),
      status: 'confirmed',
    })
    const { google_event_id: _id, etag: _etag, timezone: _tz, ...unsynced } = row
    const series = { ...unsynced, recurrence: ['RRULE:FREQ=DAILY'] }

    const result = await run({
      calendar_id: CAL,
      crm_instance_id: 'ins_9',
      before: series,
      after: series,
    })

    expect(insertGoogleCalendarEvent.mock.calls[0]?.[2]).toMatchObject({
      recurrence: ['RRULE:FREQ=DAILY'],
      timezone: 'Australia/Melbourne',
    })
    expect(outputOf(result)).toMatchObject({ write: 'existing', writeback: true })
  })
})
