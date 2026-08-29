import type { WebhookRequest } from 'skedyul'
import { ReaClient } from '../../lib/rea-client'
import {
  cacheSigningKeys,
  getCachedSigningKeys,
  isSigningKeyCacheStale,
  verifyReaWebhookSignature,
  type ReaSignatureVerifyResult,
} from '../../lib/rea-webhook-signature'
import type { ReaClientEnv } from '../../lib/rea-types'
import { getHeaderValue, getRawBodyString } from './helpers'

async function loadSigningKeys(env: ReaClientEnv) {
  if (!isSigningKeyCacheStale()) {
    return
  }

  const client = ReaClient.fromEnv(env)
  const response = await client.getSigningKeys()
  cacheSigningKeys(response.keys ?? [])
}

function logInvalidSignature(
  logPrefix: string,
  result: Extract<ReaSignatureVerifyResult, { ok: false }>,
) {
  console.warn(
    `[${logPrefix}] Invalid webhook signature reason=${result.reason}` +
      (result.keyId ? ` kid=${result.keyId}` : '') +
      (result.headerPartCount !== undefined
        ? ` headerParts=${result.headerPartCount}`
        : ''),
  )
}

export type VerifyReaWebhookResult =
  | { ok: true; rawBody: string }
  | { ok: false; status: number; body: Record<string, unknown> }

/**
 * Shared signature verification for REA webhooks.
 * Handshake without signature → 200 validated.
 */
export async function verifyReaWebhookRequest(
  request: WebhookRequest,
  env: ReaClientEnv,
  logPrefix: string,
): Promise<VerifyReaWebhookResult> {
  const rawBody = getRawBodyString(request)
  const signatureHeader = getHeaderValue(request.headers, 'x-rea-signature')

  if (!signatureHeader?.trim()) {
    return {
      ok: false,
      status: 200,
      body: { status: 'validated' },
    }
  }

  if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
    console.error(`[${logPrefix}] Missing REA client credentials`)
    return {
      ok: false,
      status: 500,
      body: { error: 'REA client credentials not configured' },
    }
  }

  try {
    await loadSigningKeys(env)
  } catch (error) {
    console.error(`[${logPrefix}] Failed to load signing keys:`, error)
    return {
      ok: false,
      status: 500,
      body: { error: 'Failed to load REA signing keys' },
    }
  }

  let signingKeys = getCachedSigningKeys()
  let result = await verifyReaWebhookSignature({
    rawBody,
    signatureHeader,
    signingKeys,
  })

  if (!result.ok) {
    try {
      const client = ReaClient.fromEnv(env)
      const response = await client.getSigningKeys()
      cacheSigningKeys(response.keys ?? [])
      signingKeys = response.keys ?? []

      result = await verifyReaWebhookSignature({
        rawBody,
        signatureHeader,
        signingKeys,
      })
    } catch (error) {
      console.error(`[${logPrefix}] Signature verification failed:`, error)
    }
  }

  if (!result.ok) {
    logInvalidSignature(logPrefix, result)
    return {
      ok: false,
      status: 401,
      body: { error: 'Invalid webhook signature' },
    }
  }

  return { ok: true, rawBody }
}
