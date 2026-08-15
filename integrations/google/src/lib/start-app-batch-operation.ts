export type StartAppBatchOperationParams = {
  operationHandle: string
  entityHandle: string
  input?: Record<string, unknown>
  label?: string
  pageSize?: number
}

export type StartAppBatchOperationResult = {
  batchJobId: string
}

export class StartAppBatchOperationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'StartAppBatchOperationError'
    this.code = code
  }
}

/**
 * Start one platform batch job via the generic Core API.
 * Apps must not emit per-row events for multi-record pulls.
 */
export async function startAppBatchOperation(
  params: StartAppBatchOperationParams,
): Promise<StartAppBatchOperationResult> {
  const baseUrl = process.env.SKEDYUL_API_URL
  const apiToken = process.env.SKEDYUL_API_TOKEN

  if (!baseUrl) {
    throw new StartAppBatchOperationError(
      'NOT_CONFIGURED',
      'SKEDYUL_API_URL is not configured',
    )
  }
  if (!apiToken) {
    throw new StartAppBatchOperationError(
      'NOT_CONFIGURED',
      'SKEDYUL_API_TOKEN is not configured',
    )
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/core`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      method: 'batch.start',
      params,
    }),
  })

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: { batchJobId?: string } | null
    errors?: Array<{ code?: string; message?: string }>
  } | null

  if (!payload?.success || !payload.data?.batchJobId) {
    const first = payload?.errors?.[0]
    throw new StartAppBatchOperationError(
      first?.code || 'INTERNAL_ERROR',
      first?.message || `Failed to start batch operation (${response.status})`,
    )
  }

  return { batchJobId: payload.data.batchJobId }
}
