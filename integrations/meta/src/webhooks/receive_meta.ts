import type {
  WebhookDefinition,
  WebhookContext,
  WebhookRequest,
  WebhookResponse,
} from 'skedyul'
import {
  getRawBody,
  getSignatureHeader,
  handleMetaVerificationChallenge,
  parseMetaPayload,
  verifyMetaSignature,
} from '../lib/meta_webhook/verify'
import type { MetaWebhookPayload } from '../lib/meta_webhook/types'
import { handleWhatsAppWebhookEntries } from './handlers/whatsapp'
import { handleMessengerWebhookEntries } from './handlers/messenger'
import { handleInstagramWebhookEntries } from './handlers/instagram'

async function handleReceiveMeta(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const { method, body, headers } = request
  const META_WEBHOOK_VERIFY_TOKEN =
    context.env.META_WEBHOOK_VERIFY_TOKEN ?? process.env.META_WEBHOOK_VERIFY_TOKEN
  const META_APP_SECRET =
    context.env.META_APP_SECRET ?? process.env.META_APP_SECRET

  if (method === 'GET') {
    return handleMetaVerificationChallenge(request, META_WEBHOOK_VERIFY_TOKEN)
  }

  if (method !== 'POST') {
    return {
      status: 405,
      body: { error: 'Method not allowed' },
    }
  }

  if (!META_APP_SECRET) {
    console.error('[receiveMeta] META_APP_SECRET is not configured')
    return {
      status: 500,
      body: { error: 'META_APP_SECRET is not configured' },
    }
  }

  const signature = getSignatureHeader(headers)
  if (!signature) {
    return {
      status: 401,
      body: { error: 'Missing webhook signature' },
    }
  }

  const rawBody = getRawBody(body)
  if (!verifyMetaSignature(rawBody, signature, META_APP_SECRET)) {
    console.log('[receiveMeta] Invalid webhook signature')
    return {
      status: 403,
      body: { error: 'Invalid webhook signature' },
    }
  }

  let payload: MetaWebhookPayload
  try {
    payload = parseMetaPayload(body) as MetaWebhookPayload
  } catch {
    return {
      status: 400,
      body: { error: 'Invalid JSON payload' },
    }
  }

  switch (payload.object) {
    case 'whatsapp_business_account':
      await handleWhatsAppWebhookEntries(payload.entry)
      break
    case 'page':
      await handleMessengerWebhookEntries(payload.entry)
      break
    case 'instagram':
      await handleInstagramWebhookEntries(payload.entry)
      break
    default:
      console.log('[receiveMeta] Ignoring unsupported webhook object', payload.object)
  }

  return {
    status: 200,
    body: { success: true },
  }
}

export const receiveMetaRegistry: WebhookDefinition = {
  name: 'receive_meta',
  description:
    'Unified Meta webhook for WhatsApp, Messenger, and Instagram messaging',
  methods: ['GET', 'POST'],
  handler: handleReceiveMeta,
}
