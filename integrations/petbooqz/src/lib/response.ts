// Re-export SDK helpers for convenience
// Tools can import directly from 'skedyul' or from this file
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

import { createExternalError, type ToolFailure } from 'skedyul'

function isRateLimitExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  if (error.name === 'RateLimitExceededError') {
    return true
  }
  const code = (error as { code?: unknown }).code
  return code === 'RATE_LIMITED'
}

/**
 * Re-throw rate limit errors so tool-handler returns RATE_LIMITED (not external error).
 */
export function rethrowRateLimitError(error: unknown): void {
  if (isRateLimitExceededError(error)) {
    throw error
  }
}

/**
 * Create a Petbooqz API error response.
 * Wraps createExternalError with 'Petbooqz' as the service name.
 */
export function createPetbooqzError(message: string): ToolFailure {
  return createExternalError('Petbooqz', message)
}
