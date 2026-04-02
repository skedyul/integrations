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

/**
 * Create an Email/Mailgun API error response.
 * Wraps createExternalError with 'Mailgun' as the service name.
 */
export function createEmailError(message: string): ToolFailure {
  return createExternalError('Mailgun', message)
}
