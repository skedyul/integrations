import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const createGoogleEvent = jest.fn(async () => ({ emitted: true }))
const createGoogleCalendarEvent = jest.fn(async () => ({
  id: 'gcal_evt_1',
  status: 'confirmed',
  summary: 'Standup',
  start: { dateTime: '2026-08-22T09:00:00.000Z' },
  end: { dateTime: '2026-08-22T10:00:00.000Z' },
}))
const getAuthenticatedOAuthClient = jest.fn(async () => ({ client: {} }))
const loadGoogleCalendarRecord = jest.fn(async () => ({
  calendar_id: 'primary',
  summary: 'Work',
  sync_direction: 'both',
  external_read_only: false,
}))

jest.unstable_mockModule('../../lib/create-google-event.ts', () => ({
  createGoogleEvent,
}))

jest.unstable_mockModule('../../services/calendar/client.ts', () => ({
  createGoogleCalendarEvent,
}))

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
}))

jest.unstable_mockModule('../../lib/calendar_link.ts', () => ({
  assertCalendarWritable: () => undefined,
}))

const { calendarEventCreateRegistry } = await import('../calendar_event_create')

const context = {
  appInstallationId: 'inst_1',
  env: {},
}

describe('calendar_event_create', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not emit app events when sync_origin is skedyul', async () => {
    const result = await calendarEventCreateRegistry.handler(
      {
        calendar_id: 'primary',
        summary: 'Standup',
        start: '2026-08-22T09:00:00.000Z',
        end: '2026-08-22T10:00:00.000Z',
        sync_origin: 'skedyul',
        emit_app_event: false,
        skedyul_instance_id: 'ins_1',
      },
      context as never,
    )

    expect(result.success).toBe(true)
    expect(createGoogleEvent).not.toHaveBeenCalled()
    expect(createGoogleCalendarEvent).toHaveBeenCalledWith(
      {},
      'primary',
      expect.objectContaining({
        summary: 'Standup',
        extendedProperties: {
          private: {
            skedyulOrigin: 'skedyul',
            skedyulInstanceId: 'ins_1',
          },
        },
      }),
    )
  })
})
