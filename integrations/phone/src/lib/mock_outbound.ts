/** Provision env key — when "true", outbound SMS tools skip Twilio and return mocks. */
export const MOCK_OUTBOUND_MESSAGES_ENV = 'MOCK_OUTBOUND_MESSAGES'

/** Prefix for mock bulk chunk ids (reconciled without calling Twilio). */
export const MOCK_BULK_CHUNK_ID_PREFIX = 'mock-bulk-'

/** @deprecated Use MOCK_BULK_CHUNK_ID_PREFIX */
export const MOCK_BULK_OPERATION_ID_PREFIX = MOCK_BULK_CHUNK_ID_PREFIX

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

/** @deprecated Use createMockBulkChunkId */
export const createMockBulkOperationId = createMockBulkChunkId

export function isMockBulkChunkId(chunkId: string): boolean {
  return chunkId.startsWith(MOCK_BULK_CHUNK_ID_PREFIX)
}

/** @deprecated Use isMockBulkChunkId */
export const isMockBulkOperationId = isMockBulkChunkId
