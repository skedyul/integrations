/** Provision env key — when "true", outbound SMS tools skip Twilio and return mocks. */
export const MOCK_OUTBOUND_MESSAGES_ENV = 'MOCK_OUTBOUND_MESSAGES'

/** Prefix for mock bulk externalChunkId values (reconciled without calling Twilio). */
export const MOCK_EXTERNAL_CHUNK_ID_PREFIX = 'mock-bulk-'

export function isMockOutboundMessagesEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env[MOCK_OUTBOUND_MESSAGES_ENV] === 'true'
}

export function createMockSmsRemoteId(): string {
  return `mock-sms-${Date.now()}`
}

export function createMockExternalChunkId(): string {
  return `${MOCK_EXTERNAL_CHUNK_ID_PREFIX}${Date.now()}`
}

export function isMockExternalChunkId(externalChunkId: string): boolean {
  return externalChunkId.startsWith(MOCK_EXTERNAL_CHUNK_ID_PREFIX)
}
