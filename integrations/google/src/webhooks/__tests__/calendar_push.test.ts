import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

const startAppBatchOperation = jest.fn<
  (params: unknown) => Promise<{ batchJobId: string }>
>()
class StartAppBatchOperationError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'StartAppBatchOperationError'
    this.code = code
  }
}

const loadGoogleCalendarRecordByWatchChannel =
  jest.fn<(channelId: string) => Promise<GoogleCalendarRecord | null>>()

jest.unstable_mockModule('../../lib/start-app-batch-operation.ts', () => ({
  startAppBatchOperation,
  StartAppBatchOperationError,
}))

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecordByWatchChannel,
}))

const { calendarPushRegistry } = await import('../calendar_push')

const context = {
  appInstallationId: 'inst_1',
  env: {},
}

describe('calendar_push', () => {
  beforeEach(() => {
    startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1' })
    loadGoogleCalendarRecordByWatchChannel.mockReset().mockResolvedValue({
      id: 'rec_1',
      calendar_id: 'primary',
      watch_token: 'token',
      sync_enabled: true,
    } as GoogleCalendarRecord)
  })

  it('acks Google sync pings without starting a batch', async () => {
    const response = await calendarPushRegistry.handler(
      {
        headers: {
          'x-goog-channel-id': 'ch_1',
          'x-goog-resource-state': 'sync',
          'x-goog-channel-token': 'token',
        },
      } as never,
      context as never,
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'acknowledged' })
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('starts exactly one import batch for a change ping', async () => {
    const response = await calendarPushRegistry.handler(
      {
        headers: {
          'x-goog-channel-id': 'ch_1',
          'x-goog-resource-state': 'exists',
          'x-goog-channel-token': 'token',
        },
      } as never,
      context as never,
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      action: 'batch_started',
      batchJobId: 'job_1',
    })
    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation).toHaveBeenCalledWith({
      operationHandle: 'import_calendar_events',
      entityHandle: 'calendar_event',
      label: 'Push sync primary',
      input: { calendar_id: 'primary', use_sync_token: true },
    })
  })

  it('returns 200 already_running when a batch is in flight', async () => {
    startAppBatchOperation.mockRejectedValue(
      new StartAppBatchOperationError(
        'CONFLICT',
        'Another batch operation is already running for this app',
      ),
    )

    const response = await calendarPushRegistry.handler(
      {
        headers: {
          'x-goog-channel-id': 'ch_1',
          'x-goog-resource-state': 'exists',
          'x-goog-channel-token': 'token',
        },
      } as never,
      context as never,
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'already_running' })
    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
  })
})
