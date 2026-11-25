import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type Row = Record<string, unknown>

const startAppBatchOperation = jest.fn<
  (params: unknown) => Promise<{ batchJobId: string; status: 'started' | 'queued' }>
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
const getAuthenticatedOAuthClient = jest.fn(async (_env: unknown) => ({
  client: { name: 'oauth' },
  tokens: {},
}))
const removeCalendarWatch = jest.fn(async (..._args: unknown[]) => undefined)
const renewCalendarChannel = jest.fn(
  async (_auth: unknown, record: Row, _registration: { url: string }) => ({
    ...record,
    watch_channel_id: 'ch_2',
    watch_expiration: '2026-12-08T00:00:00.000Z',
  }),
)

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

jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
}))

jest.unstable_mockModule('../../lib/calendar_link.ts', () => ({
  watchTokensMatch: (stored: string | null | undefined, received: string | null | undefined) =>
    Boolean(stored && received && stored === received),
  removeCalendarWatch,
  renewCalendarChannel,
}))

const { TokenRefreshRequiredError } = await import('skedyul')
const { calendarPushRegistry } = await import('../calendar_push')

const SECRET = 'a'.repeat(64)

const calendarRow: Row = {
  id: 'ins_cal',
  google_calendar_id: 'primary',
  sync_enabled: true,
  watch_channel_id: 'ch_1',
  watch_resource_id: 'res_1',
  watch_token: SECRET,
}

let rows: Row[] = [calendarRow]

const withRegistration = {
  appInstallationId: 'inst_1',
  env: {},
  registration: { calendar_id: 'primary' },
}

function ping(headers: Record<string, string>, context: Record<string, unknown> = withRegistration) {
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

const renewRegistration = {
  id: 'whreg_primary',
  name: 'calendar_push',
  url: 'https://hooks/whreg_primary',
  context: { calendar_id: 'primary' } as Record<string, unknown> | null,
  expiresAt: '2026-12-01T00:00:00.000Z',
}

function renew(registration = renewRegistration) {
  return calendarPushRegistry.renew!({
    registration,
    env: { GOOGLE_REFRESH_TOKEN: 'r' },
    app: { id: 'app', versionId: 'v' },
    appInstallationId: 'inst_1',
    workplace: { id: 'wkp', subdomain: 'acme' },
    log: console as never,
  })
}

beforeEach(() => {
  rows = [calendarRow]
  startAppBatchOperation.mockReset().mockResolvedValue({ batchJobId: 'job_1', status: 'started' })
  getAuthenticatedOAuthClient.mockClear()
  removeCalendarWatch.mockClear()
  renewCalendarChannel.mockClear()
  instanceList.mockReset().mockImplementation(async (_model, args) => {
    const filter = args?.filter ?? {}
    const byCalendar = (filter.google_calendar_id as { eq?: string } | undefined)?.eq
    const byChannel = (filter.watch_channel_id as { eq?: string } | undefined)?.eq
    const data = rows.filter(
      (row) =>
        (byCalendar === undefined || row.google_calendar_id === byCalendar) &&
        (byChannel === undefined || row.watch_channel_id === byChannel),
    )
    return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 1 } }
  })
})

describe('calendar_push handler', () => {
  it("finds the calendar from its registration and queues one incremental import", async () => {
    const response = await ping({})

    expect(instanceList).toHaveBeenCalledWith('calendar', {
      filter: { google_calendar_id: { eq: 'primary' } },
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
      ifRunning: 'queue',
    })
  })

  it('queues behind an import already running instead of dropping the ping', async () => {
    startAppBatchOperation.mockResolvedValue({ batchJobId: 'job_q', status: 'queued' })
    const response = await ping({})
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'batch_queued', batchJobId: 'job_q' })
  })

  it('falls back to the channel id for a registration without a calendar', async () => {
    const response = await ping({}, { appInstallationId: 'inst_1', env: {} })

    expect(instanceList).toHaveBeenCalledWith('calendar', {
      filter: { watch_channel_id: { eq: 'ch_1' } },
      limit: 1,
    })
    expect(response.body).toMatchObject({ action: 'batch_started' })
  })

  it('ignores pings from the channel a renewal replaced', async () => {
    const response = await ping({ 'x-goog-channel-id': 'ch_0' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, action: 'ignored', reason: 'stale_channel' })
    expect(startAppBatchOperation).not.toHaveBeenCalled()
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

  it('returns 404 when the calendar is unknown', async () => {
    rows = []
    const response = await ping({})
    expect(response.status).toBe(404)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('acks the sync handshake without starting a batch, even before the channel is stored', async () => {
    const known = await ping({ 'x-goog-resource-state': 'sync' })
    rows = []
    const pending = await ping({ 'x-goog-resource-state': 'sync' })

    expect(known.body).toEqual({ ok: true, action: 'acknowledged' })
    expect(pending.body).toEqual({ ok: true, action: 'acknowledged' })
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('stops the channel of a calendar whose sync was turned off', async () => {
    rows = [{ ...calendarRow, sync_enabled: false }]

    const response = await ping({})

    expect(response.body).toMatchObject({ ok: true, action: 'ignored', reason: 'sync_disabled' })
    expect(removeCalendarWatch).toHaveBeenCalledTimes(1)
    expect(startAppBatchOperation).not.toHaveBeenCalled()
  })

  it('returns 500 when the import cannot be started', async () => {
    startAppBatchOperation.mockRejectedValue(
      new StartAppBatchOperationError('PRECONDITION_FAILED', 'CRM mappings not configured'),
    )
    const response = await ping({})
    expect(response.status).toBe(500)
  })
})

describe('calendar_push renew (called by the platform before the lease expires)', () => {
  it('opens a new channel on the same URL, queues one import and returns the new expiry', async () => {
    await expect(renew()).resolves.toEqual({ expiresAt: '2026-12-08T00:00:00.000Z' })

    expect(renewCalendarChannel).toHaveBeenCalledWith(
      { name: 'oauth' },
      expect.objectContaining({ calendar_id: 'primary', watch_channel_id: 'ch_1' }),
      renewRegistration,
    )
    expect(startAppBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { calendar_id: 'primary', use_sync_token: true },
        ifRunning: 'queue',
      }),
    )
  })

  it('still renews when the follow-up import cannot start', async () => {
    startAppBatchOperation.mockRejectedValue(new Error('core api down'))
    await expect(renew()).resolves.toEqual({ expiresAt: '2026-12-08T00:00:00.000Z' })
  })

  it('gives up the registration when the calendar row is gone', async () => {
    rows = []
    await expect(renew()).resolves.toEqual({ delete: true })
    expect(getAuthenticatedOAuthClient).not.toHaveBeenCalled()
    expect(renewCalendarChannel).not.toHaveBeenCalled()
  })

  it('stops the channel and gives up the registration when sync is off', async () => {
    rows = [{ ...calendarRow, sync_enabled: false }]
    await expect(renew()).resolves.toEqual({ delete: true })
    expect(removeCalendarWatch).toHaveBeenCalledWith(
      { name: 'oauth' },
      expect.objectContaining({ calendar_id: 'primary' }),
      { keepRegistration: true },
    )
    expect(renewCalendarChannel).not.toHaveBeenCalled()
  })

  it('gives up a registration that names no calendar', async () => {
    await expect(renew({ ...renewRegistration, context: null })).resolves.toEqual({ delete: true })
  })

  it('lets an expired token propagate so the platform refreshes it and retries', async () => {
    getAuthenticatedOAuthClient.mockRejectedValueOnce(
      new TokenRefreshRequiredError('expired', { tokenKey: 'GOOGLE_ACCESS_TOKEN' }),
    )
    await expect(renew()).rejects.toBeInstanceOf(TokenRefreshRequiredError)
  })
})
