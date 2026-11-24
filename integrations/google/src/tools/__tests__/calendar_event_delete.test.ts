import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()
const loadGoogleCalendarRecord =
  jest.fn<(calendarId: string, env: unknown) => Promise<GoogleCalendarRecord | null>>()
const getGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>()
const deleteGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<void>>()
const createGoogleEvent = jest.fn(async () => ({ emitted: true }))

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return { ...actual, isRuntimeContext: () => true }
})

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
  mapGoogleAuthError: (error: unknown) => error,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  getGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  insertGoogleCalendarEvent: jest.fn(),
  patchGoogleCalendarEvent: jest.fn(),
  moveGoogleCalendarEvent: jest.fn(),
}))

jest.unstable_mockModule('../../lib/create-google-event.ts', () => ({
  createGoogleEvent,
}))

const { calendarEventDeleteRegistry } = await import('../calendar_event_delete')

const context = { appInstallationId: 'inst_1', env: {} } as never

function run(raw: Record<string, unknown>) {
  const schema = calendarEventDeleteRegistry.inputSchema as unknown as {
    parse: (value: unknown) => never
  }
  return calendarEventDeleteRegistry.handler(schema.parse(raw), context)
}

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

describe('calendar_event_delete', () => {
  beforeEach(() => {
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    loadGoogleCalendarRecord.mockReset().mockResolvedValue({
      id: 'ins_cal',
      calendar_id: 'primary',
      summary: 'Primary',
    })
    getGoogleCalendarEvent.mockReset()
    deleteGoogleCalendarEvent.mockReset().mockResolvedValue(undefined)
    createGoogleEvent.mockClear()
  })

  it('deletes with sendUpdates and does not emit when called from the CRM delete workflow', async () => {
    const result = await run({
      calendar_id: 'primary',
      event_id: 'evt_1',
      send_updates: 'all',
      emit_event: 'false',
    })

    expect(result).toMatchObject({
      success: true,
      output: { deleted: true, already_deleted: false },
    })
    expect(deleteGoogleCalendarEvent).toHaveBeenCalledWith({}, 'primary', 'evt_1', {
      sendUpdates: 'all',
    })
    expect(getGoogleCalendarEvent).not.toHaveBeenCalled()
    expect(createGoogleEvent).not.toHaveBeenCalled()
  })

  it.each([404, 410])('is idempotent: %i counts as already deleted', async (status) => {
    deleteGoogleCalendarEvent.mockRejectedValue(httpError(status))

    const result = await run({ calendar_id: 'primary', event_id: 'evt_1', emit_event: false })

    expect(result).toMatchObject({
      success: true,
      output: { deleted: true, already_deleted: true },
    })
  })

  it('emits calendar.event.deleted for direct tool calls when the event existed', async () => {
    getGoogleCalendarEvent.mockResolvedValue({ id: 'evt_1', status: 'confirmed', summary: 'A' })

    await run({ calendar_id: 'primary', event_id: 'evt_1' })

    expect(createGoogleEvent).toHaveBeenCalledWith(
      'calendar.event.deleted',
      expect.objectContaining({
        event: expect.objectContaining({ google_event_id: 'evt_1', status: 'cancelled' }),
      }),
      { trigger: 'tool' },
    )
  })

  it('does not fail or emit when a direct call targets an event that is already gone', async () => {
    getGoogleCalendarEvent.mockRejectedValue(httpError(404))
    deleteGoogleCalendarEvent.mockRejectedValue(httpError(410))

    const result = await run({ calendar_id: 'primary', event_id: 'evt_1' })

    expect(result).toMatchObject({ success: true, output: { already_deleted: true } })
    expect(createGoogleEvent).not.toHaveBeenCalled()
  })

  it('returns RATE_LIMITED on 429', async () => {
    deleteGoogleCalendarEvent.mockRejectedValue(httpError(429))

    const result = await run({ calendar_id: 'primary', event_id: 'evt_1', emit_event: false })

    expect(result).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } })
  })
})
