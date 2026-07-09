/** Provision env key — when "true", outbound SMS tools skip Twilio and return mocks. */
export const MOCK_OUTBOUND_MESSAGES_ENV = 'MOCK_OUTBOUND_MESSAGES'

/** Prefix for mock bulk operation IDs (reconciled without calling Twilio). */
export const MOCK_BULK_OPERATION_ID_PREFIX = 'mock-bulk-'

export function isMockOutboundMessagesEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env[MOCK_OUTBOUND_MESSAGES_ENV] === 'true'
}

export function createMockSmsRemoteId(): string {
  return `mock-sms-${Date.now()}`
}

export function createMockBulkOperationId(): string {
  return `${MOCK_BULK_OPERATION_ID_PREFIX}${Date.now()}`
}

export function isMockBulkOperationId(operationId: string): boolean {
  return operationId.startsWith(MOCK_BULK_OPERATION_ID_PREFIX)
}
