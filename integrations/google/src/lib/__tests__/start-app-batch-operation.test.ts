import { afterEach, describe, expect, it, jest } from '@jest/globals'

const { startAppBatchOperation, StartAppBatchOperationError } = await import(
  '../start-app-batch-operation'
)

describe('startAppBatchOperation', () => {
  const originalFetch = globalThis.fetch
  const originalUrl = process.env.SKEDYUL_API_URL
  const originalToken = process.env.SKEDYUL_API_TOKEN

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.SKEDYUL_API_URL = originalUrl
    process.env.SKEDYUL_API_TOKEN = originalToken
  })

  it('posts exactly one batch.start Core API call', async () => {
    process.env.SKEDYUL_API_URL = 'https://api.example.com/'
    process.env.SKEDYUL_API_TOKEN = 'sk_wkp_test'
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        data: { batchJobId: 'job_1' },
        errors: [],
      }),
    } as Response)
    globalThis.fetch = fetchMock

    await expect(
      startAppBatchOperation({
        operationHandle: 'import_calendar_events',
        entityHandle: 'calendar_event',
        input: { calendar_id: 'primary' },
      }),
    ).resolves.toEqual({ batchJobId: 'job_1' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/api/core')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      method: 'batch.start',
      params: {
        operationHandle: 'import_calendar_events',
        entityHandle: 'calendar_event',
        input: { calendar_id: 'primary' },
      },
    })
  })

  it('maps Core API failures onto StartAppBatchOperationError', async () => {
    process.env.SKEDYUL_API_URL = 'https://api.example.com'
    process.env.SKEDYUL_API_TOKEN = 'sk_wkp_test'
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      status: 200,
      json: async () => ({
        success: false,
        data: null,
        errors: [{ code: 'CONFLICT', message: 'Another batch operation is already running for this app' }],
      }),
    } as Response)

    await expect(
      startAppBatchOperation({
        operationHandle: 'import_calendar_events',
        entityHandle: 'calendar_event',
      }),
    ).rejects.toMatchObject({
      name: 'StartAppBatchOperationError',
      code: 'CONFLICT',
    })
    expect(StartAppBatchOperationError).toBeDefined()
  })
})
