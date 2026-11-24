import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

const startAppBatchOperation = jest.fn<
  (params: unknown) => Promise<{ batchJobId: string }>
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
const ensureSyncSchedulesOnce = jest.fn(async (_id: string) => undefined)

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

jest.unstable_mockModule('../../lib/sync-schedules.ts', () => ({
  ensureSyncSchedulesOnce,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
  loadLinkedGoogleCalendars,
}))

const { calendarSyncRegistry } = await import('../calendar_sync')

const manual = { appInstallationId: 'inst_1', env: {}, trigger: 'agent' } as never
const scheduled = {
  appInstallationId: 'inst_1',
  env: {},
  trigger: 'cron',
  cron: { subscriptionId: 'crsub_1', scheduledTime: new Date(), cursor: null },
} as never

describe('calendar_sync', () => {
  beforeEach(() => {
    startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1' })
    ensureCalendarWatch.mockClear()
    ensureSyncSchedulesOnce.mockClear()
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
    })
    expect(ensureCalendarWatch).not.toHaveBeenCalled()
    expect(ensureSyncSchedulesOnce).toHaveBeenCalledWith('inst_1')
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

  describe('scheduled catch-up run', () => {
    it('reads CRM calendars only and does not re-subscribe schedules', async () => {
      await calendarSyncRegistry.handler({ enable_live_sync: false }, scheduled)

      expect(loadLinkedGoogleCalendars).toHaveBeenCalledWith({}, { crmOnly: true })
      expect(ensureSyncSchedulesOnce).not.toHaveBeenCalled()
      expect(startAppBatchOperation.mock.calls[0]?.[0]).toMatchObject({
        label: 'Scheduled Google Calendar catch-up sync',
      })
    })

    it('is a successful no-op when no calendar is sync-enabled', async () => {
      loadLinkedGoogleCalendars.mockResolvedValue([])

      const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, scheduled)

      expect(result).toMatchObject({
        success: true,
        output: { status: 'nothing_to_sync', batch_job_id: null },
      })
      expect(startAppBatchOperation).not.toHaveBeenCalled()
    })

    it('succeeds as already_running when a sync is in flight', async () => {
      startAppBatchOperation.mockRejectedValue(
        new StartAppBatchOperationError('CONFLICT', 'already running'),
      )

      const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, scheduled)

      expect(result).toMatchObject({ success: true, output: { status: 'already_running' } })
    })

    it('reports other failures as a structured error', async () => {
      startAppBatchOperation.mockRejectedValue(
        new StartAppBatchOperationError('INTERNAL_ERROR', 'boom'),
      )

      const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, scheduled)

      expect(result).toMatchObject({ success: false, error: { message: 'Google: boom' } })
    })
  })

  it('still reports a conflict to a manual caller', async () => {
    startAppBatchOperation.mockRejectedValue(
      new StartAppBatchOperationError('CONFLICT', 'already running'),
    )

    const result = await calendarSyncRegistry.handler({ enable_live_sync: false }, manual)

    expect(result).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
  })
})
