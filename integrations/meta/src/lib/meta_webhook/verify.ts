import crypto from 'crypto'
import type { WebhookRequest, WebhookResponse } from 'skedyul'

/**
 * Verify Meta webhook HMAC signature (X-Hub-Signature-256).
 */
export function verifyMetaSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const receivedHash = signature.replace('sha256=', '')

  if (expectedSignature.length !== receivedHash.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedHash),
  )
}

/**
 * Handle Meta webhook verification challenge (GET).
 */
export function handleMetaVerificationChallenge(
  request: WebhookRequest,
  verifyToken: string | undefined,
): WebhookResponse {
  const { query } = request
  const mode = query?.['hub.mode'] ?? (query?.hub as { mode?: string } | undefined)?.mode
  const token =
    query?.['hub.verify_token'] ??
    (query?.hub as { verify_token?: string } | undefined)?.verify_token
  const challenge =
    query?.['hub.challenge'] ??
    (query?.hub as { challenge?: string } | undefined)?.challenge

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[receiveMeta] Webhook verification successful')
    return {
      status: 200,
      body: challenge ?? '',
    }
  }

  console.log('[receiveMeta] Webhook verification failed', {
    mode,
    tokenMatch: token === verifyToken,
  })

  return {
    status: 403,
    body: { error: 'Verification failed' },
  }
}

export function getRawBody(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body ?? {})
}

export function parseMetaPayload(body: unknown): unknown {
  return typeof body === 'string' ? JSON.parse(body) : body
}

export function getSignatureHeader(
  headers: Record<string, string | undefined>,
): string | undefined {
  return headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256']
}
