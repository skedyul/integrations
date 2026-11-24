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
  deleteGoogleCalendarEvent: jest.fn(),
  moveGoogleCalendarEvent: jest.fn(),
}))

jest.unstable_mockModule('../../lib/create-google-event.ts', () => ({
  createGoogleEvent,
}))

const { calendarEventCreateRegistry } = await import('../calendar_event_create')
const { skedyulGoogleEventId } = await import('../../services/calendar/event-ids')

const context = { appInstallationId: 'inst_1', env: {} } as never

/** Same as the SDK: parse args with the tool's inputSchema, then call the handler. */
function run(raw: Record<string, unknown>) {
  const schema = calendarEventCreateRegistry.inputSchema as unknown as {
    parse: (value: unknown) => never
  }
  return calendarEventCreateRegistry.handler(schema.parse(raw), context)
}

const calendarRecord: GoogleCalendarRecord = {
  id: 'ins_cal',
  calendar_id: 'team@group.calendar.google.com',
  crm_instance_id: 'ins_cal',
  summary: 'Team',
  timezone: 'Australia/Melbourne',
  sync_direction: 'both',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outputOf(result: unknown): any {
  expect((result as { success?: boolean }).success).toBe(true)
  return (result as { output?: unknown }).output
}

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

const base = {
  calendar_id: 'team@group.calendar.google.com',
  summary: 'Standup',
  start: '2026-08-24T23:00:00.000Z',
  end: '2026-08-24T23:30:00.000Z',
  emit_event: 'false',
}

describe('calendar_event_create', () => {
  beforeEach(() => {
    instanceGet.mockReset()
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    loadGoogleCalendarRecord.mockReset().mockResolvedValue(calendarRecord)
    insertGoogleCalendarEvent.mockReset()
    patchGoogleCalendarEvent.mockReset()
    getGoogleCalendarEvent.mockReset()
    createGoogleEvent.mockClear()
  })

  it('creates a recurring series in Google with its recurrence and a deterministic id', async () => {
    insertGoogleCalendarEvent.mockImplementation(async (_auth, _cal, _input, options) => ({
      id: (options as { eventId: string }).eventId,
      status: 'confirmed',
      etag: '"e1"',
      htmlLink: 'https://calendar.google.com/x',
      updated: '2026-08-20T00:00:00.000Z',
    }))

    const result = await run({
        ...base,
        recurrence: '["RRULE:FREQ=WEEKLY;BYDAY=MO","EXDATE;TZID=Australia/Melbourne:20260831T090000"]',
        crm_instance_id: 'ins_series',
      })

    expect(result.success).toBe(true)
    const [, calendarId, body, options] = insertGoogleCalendarEvent.mock.calls[0] ?? []
    expect(calendarId).toBe('team@group.calendar.google.com')
    expect(body).toMatchObject({
      summary: 'Standup',
      recurrence: [
        'RRULE:FREQ=WEEKLY;BYDAY=MO',
        'EXDATE;TZID=Australia/Melbourne:20260831T090000',
      ],
      // No timezone on the row: the calendar's zone (Google requires one on series).
      timezone: 'Australia/Melbourne',
    })
    expect(options).toEqual({ eventId: skedyulGoogleEventId('ins_series') })
    {
      const output = outputOf(result)
      expect(output.write).toBe('insert')
      expect(output.event).toMatchObject({
        google_event_id: skedyulGoogleEventId('ins_series'),
        etag: '"e1"',
        html_link: 'https://calendar.google.com/x',
        updated_at: '2026-08-20T00:00:00.000Z',
      })
    }
    expect(createGoogleEvent).not.toHaveBeenCalled()
  })

  it('treats a 409 retry as already created and returns the existing event', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(httpError(409))
    getGoogleCalendarEvent.mockResolvedValue({ id: skedyulGoogleEventId('ins_1'), status: 'confirmed' })

    const result = await run({ ...base, crm_instance_id: 'ins_1' })

    expect(result.success).toBe(true)
    expect(outputOf(result).write).toBe('existing')
    expect(outputOf(result).event.google_event_id).toBe(skedyulGoogleEventId('ins_1'))
  })

  it('never inserts when the row already has a Google id', async () => {
    getGoogleCalendarEvent.mockResolvedValue({ id: 'evt_existing', status: 'confirmed' })

    const result = await run({ ...base, google_event_id: 'evt_existing', crm_instance_id: 'ins_1' })

    expect(result.success).toBe(true)
    expect(insertGoogleCalendarEvent).not.toHaveBeenCalled()
    expect(getGoogleCalendarEvent).toHaveBeenCalledWith({}, base.calendar_id, 'evt_existing')
  })

  it('patches the series occurrence for an exception whose master is a Google id', async () => {
    patchGoogleCalendarEvent.mockResolvedValue({
      id: 'master123_20260817T090000Z',
      status: 'confirmed',
      recurringEventId: 'master123',
    })

    const result = await run({
        ...base,
        recurring_event_id: 'master123',
        original_start: '2026-08-17T09:00:00.000Z',
        crm_instance_id: 'ins_exception',
      })

    expect(result.success).toBe(true)
    expect(insertGoogleCalendarEvent).not.toHaveBeenCalled()
    expect(patchGoogleCalendarEvent.mock.calls[0]?.[2]).toBe('master123_20260817T090000Z')
    expect(outputOf(result).write).toBe('instance')
    expect(outputOf(result).event.google_event_id).toBe('master123_20260817T090000Z')
  })

  it('resolves a CRM master id to its Google id and uses yyyyMMdd for all-day', async () => {
    instanceGet.mockResolvedValue({ id: 'ins_master', google_event_id: 'gmaster' })
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'gmaster_20260817', status: 'confirmed' })

    await run({
        ...base,
        start: '2026-08-17',
        end: '2026-08-18',
        all_day: 'true',
        recurring_event_id: 'ins_master',
        original_start: '2026-08-17',
      })

    expect(instanceGet).toHaveBeenCalledWith('calendar_event', 'ins_master')
    expect(patchGoogleCalendarEvent.mock.calls[0]?.[2]).toBe('gmaster_20260817')
  })

  it('uses the master deterministic id when the CRM master has no Google id yet', async () => {
    instanceGet.mockResolvedValue({ id: 'ins_new_series' })
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'x', status: 'confirmed' })

    await run({
        ...base,
        recurring_event_id: 'ins_new_series',
        original_start: '2026-08-17T09:00:00.000Z',
      })

    expect(patchGoogleCalendarEvent.mock.calls[0]?.[2]).toBe(
      `${skedyulGoogleEventId('ins_new_series')}_20260817T090000Z`,
    )
  })

  it('returns NOT_FOUND when the CRM master no longer exists', async () => {
    instanceGet.mockResolvedValue(null)

    const result = await run({
        ...base,
        recurring_event_id: 'ins_gone',
        original_start: '2026-08-17T09:00:00.000Z',
      })

    expect(result).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(patchGoogleCalendarEvent).not.toHaveBeenCalled()
    expect(insertGoogleCalendarEvent).not.toHaveBeenCalled()
  })

  it('returns RATE_LIMITED on Google 403 rateLimitExceeded', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(
      Object.assign(new Error('Rate Limit Exceeded'), {
        status: 403,
        response: { status: 403, data: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } },
      }),
    )

    const result = await run(base)

    expect(result).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } })
  })
})
