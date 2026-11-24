/**
 * Classify Google API errors (gaxios / googleapis) by HTTP status and reason.
 *
 * googleapis v173 throws GaxiosError with `status` (HTTP), `code` (the HTTP
 * status as a number for API errors) and `response.data.error.errors[].reason`.
 * Tests and older clients may only set `code`, so every helper reads both.
 */

type ErrorLike = {
  status?: unknown
  code?: unknown
  errors?: unknown
  response?: {
    status?: unknown
    headers?: unknown
    data?: unknown
  }
}

function asErrorLike(error: unknown): ErrorLike | null {
  return error != null && typeof error === 'object' ? (error as ErrorLike) : null
}

function asStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value < 600) {
    return value
  }
  if (typeof value === 'string' && /^\d{3}$/.test(value)) {
    return Number(value)
  }
  return undefined
}

export function googleErrorStatus(error: unknown): number | undefined {
  const like = asErrorLike(error)
  if (!like) return undefined
  return asStatus(like.status) ?? asStatus(like.response?.status) ?? asStatus(like.code)
}

function reasonsFrom(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) =>
      entry && typeof entry === 'object' && typeof (entry as { reason?: unknown }).reason === 'string'
        ? String((entry as { reason: string }).reason)
        : '',
    )
    .filter((reason) => reason.length > 0)
}

export function googleErrorReasons(error: unknown): string[] {
  const like = asErrorLike(error)
  if (!like) return []
  const data = like.response?.data
  const nested =
    data && typeof data === 'object' && 'error' in data
      ? (data as { error?: { errors?: unknown } }).error?.errors
      : undefined
  return [...reasonsFrom(like.errors), ...reasonsFrom(nested)]
}

/** 404 Not Found or 410 Gone: the event (or instance) no longer exists. */
export function isGoogleNotFound(error: unknown): boolean {
  const status = googleErrorStatus(error)
  return status === 404 || status === 410
}

/** 409: an event with the requested client id already exists. */
export function isGoogleConflict(error: unknown): boolean {
  return googleErrorStatus(error) === 409
}

/** 412: If-Match etag did not match the current event. */
export function isGooglePreconditionFailed(error: unknown): boolean {
  return googleErrorStatus(error) === 412
}

const RATE_LIMIT_REASONS = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'quotaExceeded',
])

/** 429, or 403 with a rate-limit reason (Google uses both). */
export function isGoogleRateLimited(error: unknown): boolean {
  const status = googleErrorStatus(error)
  if (status === 429) return true
  if (status !== 403) return false
  return googleErrorReasons(error).some((reason) => RATE_LIMIT_REASONS.has(reason))
}

/** Calendars such as holidays/birthdays reject events.watch. */
export function isGooglePushNotSupported(error: unknown): boolean {
  return googleErrorReasons(error).includes('pushNotSupportedForRequestedResource')
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined
  const getter = (headers as { get?: unknown }).get
  if (typeof getter === 'function') {
    const value = (getter as (key: string) => unknown).call(headers, name)
    return typeof value === 'string' ? value : undefined
  }
  const record = headers as Record<string, unknown>
  const value = record[name] ?? record[name.toLowerCase()]
  return typeof value === 'string' ? value : undefined
}

/** Retry-After (seconds or HTTP date) in milliseconds, when Google sent one. */
export function googleRetryAfterMs(error: unknown, now = Date.now()): number | undefined {
  const raw = readHeader(asErrorLike(error)?.response?.headers, 'retry-after')
  if (!raw) return undefined
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000)
  }
  const at = Date.parse(raw)
  if (Number.isFinite(at)) {
    return Math.max(0, at - now)
  }
  return undefined
}
