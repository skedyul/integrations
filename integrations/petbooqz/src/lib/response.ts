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

import { createExternalError, RateLimitExceededError, type ToolFailure } from 'skedyul'

/**
 * Re-throw rate limit errors so tool-handler returns RATE_LIMITED (not external error).
 */
export function rethrowRateLimitError(error: unknown): void {
  if (error instanceof RateLimitExceededError) {
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
