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

/** Format unknown thrown values for tool error messages. */
export function formatToolError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.length > 0) {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

/**
 * Create a Core API / CRM error response for instance.* operations.
 */
export function createCoreApiError(message: string): ToolFailure {
  return createExternalError('Core API', message)
}

/**
 * Create a Phone/Twilio API error response.
 * Wraps createExternalError with 'Twilio' as the service name.
 */
export function createPhoneError(message: string): ToolFailure {
  return createExternalError('Twilio', message)
}
