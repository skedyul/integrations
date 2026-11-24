import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type Row = Record<string, unknown>

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

const instanceList = jest.fn<
  (model: string, args?: { filter?: Record<string, unknown>; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, list: instanceList },
    isRuntimeWebhookContext: () => true,
  }
})

jest.unstable_mockModule('../../lib/start-app-batch-operation.ts', () => ({
  startAppBatchOperation,
  StartAppBatchOperationError,
}))

const { calendarPushRegistry } = await import('../calendar_push')

const context = {
  appInstallationId: 'inst_1',
  env: {},
}

const SECRET = 'a'.repeat(64)

const calendarRow: Row = {
  id: 'ins_cal',
  google_calendar_id: 'primary',
  sync_enabled: true,
  watch_channel_id: 'ch_1',
  watch_resource_id: 'res_1',
  watch_token: SECRET,
}

function ping(headers: Record<string, string>) {
  return calendarPushRegistry.handler(
    {
      headers: {
        'x-goog-channel-id': 'ch_1',
        'x-goog-resource-state': 'exists',
        'x-goog-channel-token': SECRET,
        'x-goog-resource-id': 'res_1',
        ...headers,
      },
    } as never,
    context as never,
  )
}

describe('calendar_push', () => {
  beforeEach(() => {
    startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1' })
    instanceList.mockReset().mockImplementation(async (_model, args) => {
      const channel = (args?.filter?.watch_channel_id as { eq?: string } | undefined)?.eq
      const data = channel === calendarRow.watch_channel_id ? [calendarRow] : []
      return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 1 } }
    })
  })

  it('looks the calendar up by channel id and starts exactly one incremental import', async () => {
    const response = await ping({})

    expect(instanceList).toHaveBeenCalledWith('calendar', {
      filter: { watch_channel_id: { eq: 'ch_1' } },
      limit: 1,
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'batch_started', batchJobId: 'job_1' })
    expect(startAppBatchOperation).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation).toHaveBeenCalledWith({
      operationHandle: 'import_calendar_events',
      entityHandle: 'calendar_event',
      label: 'Push sync primary',
      input: { calendar_id: 'primary', use_sync_token: true },
    })
  })

  it('rejects a ping whose token does not match the stored secret', async () => {
    const response = await ping({ 'x-goog-channel-token': 'primary' })

    expect(response.status).toBe(403)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('rejects a ping without a token', async () => {
    const response = await ping({ 'x-goog-channel-token': '' })

    expect(response.status).toBe(403)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('rejects a ping for another resource on a known channel', async () => {
    const response = await ping({ 'x-goog-resource-id': 'res_other' })

    expect(response.status).toBe(403)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown channel instead of trusting a calendar id', async () => {
    const response = await ping({ 'x-goog-channel-id': 'ch_unknown' })

    expect(response.status).toBe(404)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('acks the sync handshake without starting a batch, even before the channel is stored', async () => {
    const known = await ping({ 'x-goog-resource-state': 'sync' })
    const pending = await ping({ 'x-goog-resource-state': 'sync', 'x-goog-channel-id': 'ch_new' })

    expect(known.body).toEqual({ ok: true, action: 'acknowledged' })
    expect(pending.body).toEqual({ ok: true, action: 'acknowledged' })
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('ignores pings for a calendar whose sync was turned off', async () => {
    instanceList.mockResolvedValue({
      data: [{ ...calendarRow, sync_enabled: false }],
      pagination: { page: 1, total: 1, hasMore: false, limit: 1 },
    })

    const response = await ping({})

    expect(response.body).toMatchObject({ ok: true, action: 'ignored' })
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('returns 200 already_running when a batch is in flight', async () => {
    startAppBatchOperation.mockRejectedValue(
      new StartAppBatchOperationError(
        'CONFLICT',
        'Another batch operation is already running for this app',
      ),
    )

    const response = await ping({})

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'already_running' })
  })
})
