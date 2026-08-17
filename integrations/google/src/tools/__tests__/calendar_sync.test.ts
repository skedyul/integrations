import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

const startAppBatchOperation = jest.fn<
  (params: unknown) => Promise<{ batchJobId: string }>
>()
const ensureCalendarWatch = jest.fn()
const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()
const loadGoogleCalendarRecord =
  jest.fn<(calendarId: string) => Promise<GoogleCalendarRecord | null>>()
const loadLinkedGoogleCalendars = jest.fn<() => Promise<GoogleCalendarRecord[]>>()

jest.unstable_mockModule('../../lib/start-app-batch-operation.ts', () => ({
  startAppBatchOperation,
  StartAppBatchOperationError: class StartAppBatchOperationError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

jest.unstable_mockModule('../../lib/calendar_link.ts', () => ({
  ensureCalendarWatch,
}))

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
}))

const { calendarSyncRegistry } = await import('../calendar_sync')

const context = {
  appInstallationId: 'inst_1',
  env: {},
}

describe('calendar_sync', () => {
  beforeEach(() => {
    startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1' })
    ensureCalendarWatch.mockReset()
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    loadGoogleCalendarRecord.mockReset()
    loadLinkedGoogleCalendars.mockReset().mockResolvedValue([
      { id: 'rec_1', calendar_id: 'primary', sync_enabled: true } as GoogleCalendarRecord,
      { id: 'rec_2', calendar_id: 'work', sync_enabled: true } as GoogleCalendarRecord,
    ])
  })

  it('starts exactly one import_calendar_events batch and does not watch by default', async () => {
    const result = await calendarSyncRegistry.handler(
      { enable_live_sync: false },
      context as never,
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toEqual({
        batch_job_id: 'job_1',
        operation_handle: 'import_calendar_events',
        calendars: 2,
        live_sync_enabled: false,
      })
    }
    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation).toHaveBeenCalledWith({
      operationHandle: 'import_calendar_events',
      entityHandle: 'calendar_event',
      label: 'Sync Google Calendar events',
      input: { use_sync_token: true },
    })
    expect(ensureCalendarWatch).not.toHaveBeenCalled()
  })

  it('passes a single calendar_id through to the one batch job', async () => {
    loadGoogleCalendarRecord.mockResolvedValue({
      id: 'rec_1',
      calendar_id: 'primary',
      sync_enabled: true,
    } as GoogleCalendarRecord)

    await calendarSyncRegistry.handler(
      { calendar_id: 'primary', enable_live_sync: false },
      context as never,
    )

    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation.mock.calls[0]?.[0]).toMatchObject({
      input: { calendar_id: 'primary', use_sync_token: true },
    })
  })
})
