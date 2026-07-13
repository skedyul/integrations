/** Provision env key — when "true", outbound SMS tools skip Twilio and return mocks. */
export const MOCK_OUTBOUND_MESSAGES_ENV = 'MOCK_OUTBOUND_MESSAGES'

/** Prefix for mock bulk chunk ids (reconciled without calling Twilio). */
export const MOCK_BULK_CHUNK_ID_PREFIX = 'mock-bulk-'

export function isMockOutboundMessagesEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env[MOCK_OUTBOUND_MESSAGES_ENV] === 'true'
}

export function createMockSmsRemoteId(): string {
  return `mock-sms-${Date.now()}`
}

export function createMockBulkChunkId(): string {
  return `${MOCK_BULK_CHUNK_ID_PREFIX}${Date.now()}`
}

export function isMockBulkChunkId(chunkId: string): boolean {
  return chunkId.startsWith(MOCK_BULK_CHUNK_ID_PREFIX)
}
