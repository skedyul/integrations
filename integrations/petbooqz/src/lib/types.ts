/**
 * Common error response shape from Petbooqz API
 */
export interface PetbooqzErrorResponse {
  error_description?: string
  messagecode?: string
  message?: string
}

/**
 * Type guard to check if response is an error
 */
export function isPetbooqzError(response: unknown): response is PetbooqzErrorResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    ('error_description' in response || 
     ('messagecode' in response && (response as PetbooqzErrorResponse).messagecode === 'Error'))
  )
}

/**
 * Extract error message from Petbooqz error response
 */
export function getErrorMessage(response: PetbooqzErrorResponse): string {
  return response.error_description || response.message || 'Unknown error'
}
