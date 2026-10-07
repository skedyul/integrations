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
  createTokenRefreshRequired,
  type ToolFailure,
} from 'skedyul'

export const GOOGLE_ACCESS_TOKEN_KEY = 'GOOGLE_ACCESS_TOKEN'

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
