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

export function createGoogleError(message: string): ToolFailure {
  return createExternalError('Google', message)
}
