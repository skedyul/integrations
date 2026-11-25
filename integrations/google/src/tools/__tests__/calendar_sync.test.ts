import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

const startAppBatchOperation = jest.fn<
  (params: unknown) => Promise<{ batchJobId: string; status: 'started' | 'queued' }>
>()
class StartAppBatchOperationError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
const ensureCalendarWatch = jest.fn(async (_auth: unknown, record: GoogleCalendarRecord) => record)
const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()
const loadGoogleCalendarRecord =
  jest.fn<(calendarId: string) => Promise<GoogleCalendarRecord | null>>()
const loadLinkedGoogleCalendars =
  jest.fn<(env: unknown, options?: { crmOnly?: boolean }) => Promise<GoogleCalendarRecord[]>>()

jest.unstable_mockModule('../../lib/start-app-batch-operation.ts', () => ({
  startAppBatchOperation,
  StartAppBatchOperationError,
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

const manual = { appInstallationId: 'inst_1', env: {}, trigger: 'agent' } as never

describe('calendar_sync', () => {
  beforeEach(() => {
    startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1', status: 'started' })
    ensureCalendarWatch.mockClear()
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
    loadGoogleCalendarRecord.mockReset()
    loadLinkedGoogleCalendars.mockReset().mockResolvedValue([
      { id: 'rec_1', calendar_id: 'primary', sync_enabled: true } as GoogleCalendarRecord,
      { id: 'rec_2', calendar_id: 'work', sync_enabled: true } as GoogleCalendarRecord,
    ])
  })

  it('starts exactly one import_calendar_events batch and does not watch by default', async () => {
    const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, manual)

    expect(result).toMatchObject({
      success: true,
      output: {
        batch_job_id: 'job_1',
        operation_handle: 'import_calendar_events',
        status: 'started',
        calendars: 2,
        live_sync_enabled: false,
      },
    })
    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation).toHaveBeenCalledWith({
      operationHandle: 'import_calendar_events',
      entityHandle: 'calendar_event',
      label: 'Sync Google Calendar events',
      input: { use_sync_token: true },
      ifRunning: 'queue',
    })
    expect(ensureCalendarWatch).not.toHaveBeenCalled()
  })

  it('passes a single calendar_id through to the one batch job', async () => {
    loadGoogleCalendarRecord.mockResolvedValue({
      id: 'rec_1',
      calendar_id: 'primary',
      sync_enabled: true,
    } as GoogleCalendarRecord)

    await calendarSyncRegistry.handler({ calendar_id: 'primary', enable_live_sync: false }, manual)

    expect(startAppBatchOperation.mock.calls[0]?.[0]).toMatchObject({
      input: { calendar_id: 'primary', use_sync_token: true },
    })
  })

  it('opens push channels when live sync is requested', async () => {
    await calendarSyncRegistry.handler({ enable_live_sync: true }, manual)

    expect(ensureCalendarWatch).toHaveBeenCalledTimes(2)
  })

  it('queues behind an import already running', async () => {
    startAppBatchOperation.mockResolvedValue({ batchJobId: 'job_q', status: 'queued' })

    const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, manual)

    expect(result).toMatchObject({
      success: true,
      output: { batch_job_id: 'job_q', status: 'queued' },
    })
  })

  it('reports a missing calendar map as a validation error', async () => {
    startAppBatchOperation.mockRejectedValue(
      new StartAppBatchOperationError('PRECONDITION_FAILED', 'CRM mappings not configured'),
    )

    const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, manual)

    expect(result).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
  })

  it('reports other failures as a structured error', async () => {
    startAppBatchOperation.mockRejectedValue(new StartAppBatchOperationError('INTERNAL_ERROR', 'boom'))

    const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, manual)

    expect(result).toMatchObject({ success: false, error: { message: 'Google: boom' } })
  })
})
