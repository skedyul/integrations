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
 * Create a Meta/WhatsApp API error response.
 * Wraps createExternalError with 'Meta' as the service name.
 */
export function createMetaError(message: string): ToolFailure {
  return createExternalError('Meta', message)
}
