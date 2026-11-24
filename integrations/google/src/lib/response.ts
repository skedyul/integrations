export {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
  createExternalError,
  createValidationError,
  createAuthError,
  createRateLimitError,
  createListResponse,
  isSuccess,
  isFailure,
  type ToolResult,
  type ToolSuccess,
  type ToolFailure,
} from 'skedyul'

import {
  AppAuthInvalidError,
  TokenRefreshRequiredError,
  createAuthError,
  createExternalError,
  createRateLimitError,
  createTokenRefreshRequired,
  type ToolFailure,
} from 'skedyul'
import { googleRetryAfterMs, isGoogleRateLimited } from './google-errors'

export const GOOGLE_ACCESS_TOKEN_KEY = 'GOOGLE_ACCESS_TOKEN'

/** Back-off used when Google rate-limits without a Retry-After header. */
export const GOOGLE_RATE_LIMIT_DEFAULT_RETRY_MS = 60_000

export function createGoogleError(message: string): ToolFailure {
  return createExternalError('Google', message)
}

export function googleAuthToolFailure(error: unknown): ToolFailure | null {
  if (error instanceof TokenRefreshRequiredError) {
    return createTokenRefreshRequired(error.message, {
      tokenKey: error.tokenKey ?? GOOGLE_ACCESS_TOKEN_KEY,
    })
  }
  if (error instanceof AppAuthInvalidError) {
    return createAuthError(error.message)
  }
  return null
}

/**
 * Google 429 / 403 rateLimitExceeded → RATE_LIMITED so the platform backs off
 * instead of recording a hard sync failure and retrying immediately.
 */
export function googleRateLimitToolFailure(error: unknown): ToolFailure | null {
  if (!isGoogleRateLimited(error)) {
    return null
  }
  return createRateLimitError(googleRetryAfterMs(error) ?? GOOGLE_RATE_LIMIT_DEFAULT_RETRY_MS)
}

/** Auth → RATE_LIMITED → structured Google error, in that order. */
export function googleToolFailure(error: unknown): ToolFailure {
  return (
    googleAuthToolFailure(error) ??
    googleRateLimitToolFailure(error) ??
    createGoogleError(error instanceof Error ? error.message : String(error))
  )
}
