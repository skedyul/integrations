import { Buffer } from 'node:buffer'
import * as ed from '@noble/ed25519'
import type { ReaSigningKey } from './rea-types'

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60

interface SigningKeyCacheEntry {
  keys: Map<string, ReaSigningKey>
  fetchedAtMs: number
}

let signingKeyCache: SigningKeyCacheEntry | null = null
const SIGNING_KEY_CACHE_TTL_MS = 60 * 60 * 1000

export function resetSigningKeyCache(): void {
  signingKeyCache = null
}

export function cacheSigningKeys(keys: ReaSigningKey[]): void {
  signingKeyCache = {
    keys: new Map(keys.map((key) => [key.kid, key])),
    fetchedAtMs: Date.now(),
  }
}

export function getCachedSigningKey(kid: string): ReaSigningKey | undefined {
  return signingKeyCache?.keys.get(kid)
}

export function getCachedSigningKeys(): ReaSigningKey[] {
  if (!signingKeyCache) {
    return []
  }
  return Array.from(signingKeyCache.keys.values())
}

export function isSigningKeyCacheStale(): boolean {
  if (!signingKeyCache) {
    return true
  }
  return Date.now() - signingKeyCache.fetchedAtMs > SIGNING_KEY_CACHE_TTL_MS
}

export interface ParsedReaSignature {
  keyId: string
  timestamp: number
  signatureBase64: string
}

export function parseReaSignatureHeader(
  header: string | undefined,
): ParsedReaSignature | null {
  if (!header?.startsWith('s:')) {
    return null
  }

  const parts = header.split(':')
  if (parts.length < 4) {
    return null
  }

  const [, keyId, timestampStr, , signatureBase64] = parts
  if (!keyId || !timestampStr || !signatureBase64) {
    return null
  }

  const timestamp = parseInt(timestampStr, 10)
  if (Number.isNaN(timestamp)) {
    return null
  }

  return { keyId, timestamp, signatureBase64 }
}

export function isSignatureTimestampValid(timestamp: number, nowSeconds?: number): boolean {
  const currentEpochTimeInSeconds = nowSeconds ?? Math.floor(Date.now() / 1000)
  return timestamp + EIGHT_HOURS_IN_SECONDS >= currentEpochTimeInSeconds
}

export async function verifyReaWebhookSignature(params: {
  rawBody: string
  signatureHeader: string | undefined
  signingKeys: ReaSigningKey[]
}): Promise<boolean> {
  const parsed = parseReaSignatureHeader(params.signatureHeader)
  if (!parsed) {
    return false
  }

  if (!isSignatureTimestampValid(parsed.timestamp)) {
    return false
  }

  const keyEntry =
    params.signingKeys.find((key) => key.kid === parsed.keyId) ??
    getCachedSigningKey(parsed.keyId)

  if (!keyEntry) {
    return false
  }

  const signature = Buffer.from(parsed.signatureBase64, 'base64')
  const publicKey = Buffer.from(keyEntry.x, 'base64')
  const messageBytes = Buffer.from(`${parsed.timestamp}${params.rawBody}`)

  return ed.verifyAsync(signature, messageBytes, publicKey)
}
