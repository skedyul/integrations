import type { ToolResponseMeta, ToolExecutionResult } from 'skedyul'

/**
 * Create a standardized tool response with meta information.
 * 
 * @param toolName - Name of the tool being executed
 * @param result - Either success with data or failure with error message
 * @returns Complete ToolExecutionResult with output, billing, and meta
 */
export function createToolResponse<T>(
  toolName: string,
  result: { success: true; data: T; message?: string } | { success: false; error: string },
): ToolExecutionResult<T> {
  const meta: ToolResponseMeta = {
    success: result.success,
    message: result.success ? (result.message ?? 'OK') : result.error,
    toolName,
  }

  return {
    output: result.success ? result.data : null,
    billing: { credits: 0 },
    meta,
  }
}

/**
 * Create a success response with a descriptive message.
 * Helper that wraps createToolResponse for success cases.
 */
export function successResponse<T>(
  toolName: string,
  data: T,
  message?: string,
): ToolExecutionResult<T> {
  return createToolResponse(toolName, { success: true, data, message })
}

/**
 * Create an error response with a descriptive message.
 * Helper that wraps createToolResponse for error cases.
 */
export function errorResponse<T>(
  toolName: string,
  error: string,
): ToolExecutionResult<T> {
  return createToolResponse<T>(toolName, { success: false, error })
}
